/* globals d3 reorder
 */
import {mock} from "../components/connectivityMatrix/mock.js";
import {cmMatrixView} from "../components/connectivityMatrixView/cmMatrixView";

export class MainController {
  constructor($log, $timeout, $scope, toastr, cmMatrixViewFactory, cmModelFactory, cmMatrixFactory, cmGraphFactory, viewState, modalService) {
    'ngInject';

    this.viewState = viewState;
    this.$scope = $scope;
    this.$log = $log;
    this.toastr = toastr;
    this.cmModelFactory = cmModelFactory;
    this.cmMatrixViewFactory = cmMatrixViewFactory;
    this.modalService = modalService;
    this.hasActiveQuery = false;
    this.hasQueryError = false;
    this.queryError = "";

    this.ui = {};

    this.ui.debugNodeHiding = true;
    this.ui.nodeId = 168;

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

    let self = this;
    $timeout(function () {
      self.createMatrixAndUi(self.model)
    }, 1);

  }

  createCategoricalCollapseControls(model) {
    this.ui.availableCategoricalAttr = ["none"];
    this.ui.availableCategoricalAttr = this.ui.availableCategoricalAttr.concat(model.getCmGraph().getCategoricalNodeAttrNames());
    this.ui.selectedCategoricalColAttr = this.ui.availableCategoricalAttr[0];
    this.ui.selectedCategoricalRowAttr = this.ui.availableCategoricalAttr[0];
  }

  createMatrix(model, encoding) {
    this.svg.selectAll("*").remove();
    this.model = model;
    this.matrix = this.cmMatrixViewFactory.createConnectivityMatrix(this.svg, model, this.$scope, this.viewState, this);
    this.onEncodingChanged(encoding);
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

  onDebugNodeHiding(nodeId, makeVisible) {
    if (!makeVisible) {
      this.viewState.hideNodes([parseInt(nodeId)]);
    } else {
      this.viewState.showNodes([parseInt(nodeId)]);
    }

  }

  onEncodingChanged(encoding) {
    this.matrix.setEncoding(encoding);

    d3.select("#encoding-legend")
      .selectAll("*")
      .remove();

    let group = d3.select("#encoding-legend")
      .append("g")
      .attr("transform", "translate(1, 4)");

    let width = d3.select("#select-encoding").node().getBoundingClientRect().width;
    if (this.matrix.legend) {
      this.matrix.legend.createView(group, width, width);
      this.ui.hasLegend = true;
    } else {
      this.ui.hasLegend = false;
    }
  }

  onQuerySubmitted(query) {
    let self = this;

    self.hasActiveQuery = true;
    self.hasQueryError = false;

    // remove svg when query button pressed
    this.svg.selectAll("*").remove();

    // remove legend when query button pressed
    d3.select("#encoding-legend")
      .selectAll("*")
      .remove();

    let success = function (model) {
      // remove the text upon success
      self.hasActiveQuery = false;
      self.model = model;
      self.createMatrixAndUi(model);
    };

    let failure = function (error) {
      // upon failure, update text mesage to the the error message
      self.hasActiveQuery = false;
      self.hasQueryError = true;
      self.queryError = "Query Error: \n" + error.data.message;

      // log the error
      self.$log.error("The query failed", error);

      if (error.data) {
        self.queryError = "Query Error: \n" + error.data.message;
      } else {
        self.queryError = "The server sent no response! Check console."
      }
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

  /**
   * Called when the user wants to filter nodes by a quantitative attributes. Opens a modal containing a
   * histogram of 'attribute' for all nodes.
   */
  openNodeAttributeFilter(attribute) {

    // Get lists of all nodes and their attributes
    let nodeIndexes = this.model.getFlattenedNodeIndexes();
    let nodeAttributes = this.model.getNodeAttr(nodeIndexes, attribute);

    // Get the range for the current attribute, or create one if it doesn't exist.
    let range = this.viewState.filterRanges[attribute];
    if (range == undefined) {
      range = [d3.min(nodeAttributes), d3.max(nodeAttributes)];
    }

    // When the modal is finished, save the range.
    let self = this;
    let callback = function (result) {
      let attribute = result.attribute;
      let range = result.range;
      let nodeValues = result.values;
      let nodeIndexes = result.nodeIndexes;

      let hideNodes = [];
      let showNodes = [];
      for (var i = 0; i < nodeValues.length; ++i) {
        if (nodeValues[i] < range[0] || nodeValues[i] > range[1]) {
          hideNodes.push(nodeIndexes[i]);
        } else {
          showNodes.push(nodeIndexes[i]);
        }
      }
      self.viewState.hideNodes(hideNodes);
      self.viewState.showNodes(showNodes);
      self.viewState.filterRanges[attribute] = range;
    };

    // Open the modal.
    this.modalService.getValueRange("Select range of " + attribute, nodeAttributes, range, nodeIndexes, attribute, callback);
  }

  /**
   * Called when the user clicks 'filter' for the node Ids. Opens a modal containing a checklist of nodes ids.
   */
  openNodeIndexFilter() {
    let nodeIndexes = this.model.getFlattenedNodeIndexes();

    // "selected" nodes are visible. Unselected nodes are currently hidden.
    let isNodeSelected = this.viewState.getHiddenNodesAsSelection(nodeIndexes);

    // Tell viewState the user updated visible nodes. This causes viewState to broadcast changes and ultimately
    // updates the nodes this is displaying.
    let modalSuccess = function (selection) {
      this.viewState.setHiddenNodesFromSelection(selection);
    };
    modalSuccess = modalSuccess.bind(this);

    this.modalService.getSelectionFromList("Select nodes", nodeIndexes, isNodeSelected, modalSuccess);
  }
}
