/* globals d3 reorder
 */
import {mock} from "../components/connectivityMatrix/mock.js";
import {cmMatrixView} from "../components/connectivityMatrixView/cmMatrixView";

export class MainController {
  constructor($log, toastr, cmMatrixViewFactory, cmModelFactory, cmMatrixFactory, cmGraphFactory) {
    'ngInject';

    this.$log = $log;
    this.toastr = toastr;
    this.cmModelFactory = cmModelFactory;
    this.cmMatrixViewFactory = cmMatrixViewFactory;

    this.ui = {};

    this.svg = d3.select("#my-svg")
      .append("g")
      .attr("transform", "translate(20, 20)");

    let useLargeResult = true;
    useLargeResult = false;
    let jsonGraph = mock.output.graph;
    let jsonMatrix = mock.output.matrix;
    if (useLargeResult) {
      jsonGraph = mock.largeResult.graph;
      jsonMatrix = mock.largeResult.matrix;
    }

    let graph = cmGraphFactory.createFromJsonObject(jsonGraph);
    let matrix = cmMatrixFactory.createFromJsonObject(jsonMatrix);
    this.model = cmModelFactory.createModel(graph, matrix);

    this.createMatrixAndUi(this.model);
  }

  createCategoricalCollapseControls(model) {
    this.ui.availableCategoricalAttr = ["none"];
    this.ui.availableCategoricalAttr = this.ui.availableCategoricalAttr.concat(model.getCmGraph().getCategoricalNodeAttrNames());
    this.ui.selectedCategoricalColAttr = this.ui.availableCategoricalAttr[0];
    this.ui.selectedCategoricalRowAttr = this.ui.availableCategoricalAttr[0];

  }

  createMatrix(model, encoding) {
    this.svg.selectAll("*").remove();
    this.matrix = this.cmMatrixViewFactory.createConnectivityMatrix(this.svg, model);
    this.matrix.setEncoding(encoding);
  }

  createMatrixAndUi(model) {
    this.createCategoricalCollapseControls(model);
    this.createReorderControls();
    this.createEncodingControls();
    this.createMatrix(model, this.ui.selectedEncoding);
  }

  createReorderControls() {
    this.ui.orders = ["initial", "random", "optimal leaf"];
  }

  createEncodingControls() {
    this.ui.encodings = cmMatrixView.getAvailableEncodings();
    this.ui.selectedEncoding = this.ui.encodings[0];
  }

  onCollapseColsByAttr(attr) {
    if (attr == "none") {
      this.model.expandAllCols();
    } else {
      this.model.collapseColsByAttr(attr);
    }
    this.createMatrix(this.model, this.ui.selectedEncoding);
  }

  onCollapseRowsByAttr(attr) {
    if (attr == "none") {
      this.model.expandAllRows();
    } else {
      this.model.collapseRowsByAttr(attr);
    }
    this.createMatrix(this.model, this.ui.selectedEncoding);
  }

  onEncodingChanged(encoding) {
    this.matrix.setEncoding(encoding);
  }

  onQuerySubmitted(query) {
    let self = this;

    let success = function (model) {
      self.model = model;
      self.createMatrixAndUi(model);
    };

    let failure = function (error) {
      self.$log.error("The query failed!", error);
    };

    // Give the model factory a query string. Async call success or failure.
    this.cmModelFactory.requestAndCreateModel(query).then(success, failure);
  }

  onSortOrderChanged(order) {
    let matrix = this.model.getCurrentScalarMatrix();
    let rowPerm = undefined;
    let colPerm = undefined;
    if (order == 'random') {
      rowPerm = reorder.randomPermutation(matrix.length);
      colPerm = reorder.randomPermutation(matrix[0].length);
    } else if (order == 'optimal leaf') {
      let transpose = reorder.transpose(matrix);
      let distRows = reorder.dist()(matrix);
      let distCols = reorder.dist()(transpose);
      let order = reorder.optimal_leaf_order();
      rowPerm = order.distanceMatrix(distRows)(matrix);
      colPerm = order.distanceMatrix(distCols)(transpose);
    } else if (order == 'initial') {
      rowPerm = reorder.permutation(matrix.length);
      colPerm = reorder.permutation(matrix[0].length);
    }
    this.matrix.setSortOrders(rowPerm, colPerm);
  }
}
