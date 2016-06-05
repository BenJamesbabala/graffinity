import {cmNodeListControls} from "./nodeList/cmNodeListControls"
import {cmNodeListLeftHeader} from "./nodeList/cmNodeListLeftHeader"
export class cmNodeListManager {

  constructor(element, model, $log, $uibModal, scope, viewState, modalService, mainController) {
    this.$log = $log;
    this.$scope = scope;
    this.element = element;

    // Style for the four divs displayed in this matrix.
    this.controlsElementStyle = {};
    this.leftHeaderElementStyle = {};

    // Top row will hold controls and column headers.
    this.topDiv = element.append("div")
      .style("overflow", "hidden");

    this.controlsHeaderElement = this.topDiv.append("div")
      .attr("id", "node-list-header-controls")
      .classed("matrix-view-header-controls", true);

    // Bottom row will hold row headers nad matrix
    this.bottomDiv = element.append("div")
      .classed("matrix-view-bottom-row", true);

    this.leftHeaderElement = this.bottomDiv.append("div")
      .attr("id", "node-list-view-header-left")
      .classed("matrix-view-center", true);

    this.controlsHeaderSvg = this.controlsHeaderElement.append("svg")
      .attr({width: 1024, height: 1024});

    this.leftHeaderSvg = this.leftHeaderElement.append("svg")
      .attr({width: 1024, height: 1024});

    this.controlsHeader = new cmNodeListControls(this.controlsHeaderSvg, model, $log, $uibModal, scope, viewState,
      modalService, mainController);
    this.controlsHeader.setGridPosition([0, 0]);

    this.leftHeader = new cmNodeListLeftHeader(this.leftHeaderSvg, model, $log, $uibModal, scope, viewState,
      modalService, mainController);
    this.leftHeader.setGridPosition([0, 1]);

    this.matrices = [this.leftHeader, this.controlsHeader];
    this.updateElementPositions();

    this.$scope.$on("changeMatrixHeight", this.updateElementPositions.bind(this));
  }

  getMajorRowsAndColsAsScalarMatrix() {
    return this.matrix.getMajorRowsAndColsAsScalarMatrix();
  }

  setUseAnimation(useAnimation) {
    for (let i = 0; i < this.matrices.length; ++i) {
      this.matrices[i].setUseAnimation(useAnimation);
    }
  }

  setSortOrders(rowPerm, colPerm) {
    for (let i = 0; i < this.matrices.length; ++i) {
      this.matrices[i].setSortOrders(rowPerm, colPerm);
    }
  }

  setModel(model) {
    for (let i = 0; i < this.matrices.length; ++i) {
      this.matrices[i].setModel(model);
    }

    this.updateElementPositions();
  }

  setWidth(width) {
    this.updateElementPositions(null, width)
  }

  /**
   * Positions and resizes the 4 divs holding different parts of the matrices.
   */
  updateElementPositions(signal, width) {

    // Do not check for overflow of header height. Assume we always have enough space for it.
    this.controlsElementStyle.height = this.controlsHeader.getHeight() + 5 + "px";

    // Again, not checking for overflow of left-header width.
    this.controlsElementStyle.width = this.controlsHeader.getAttributeColWidths() + 5 + "px";
    this.leftHeaderElementStyle.width = this.controlsElementStyle.width;

    // Bound the matrix's height by screen size.
    let matrixHeight = this.leftHeader.getHeight() + 30;
    let clientHeight = angular.element(this.element)[0][0].clientHeight - this.controlsHeader.getHeight() - 50;
    if (matrixHeight > clientHeight) {
      matrixHeight = clientHeight;
    }

    this.leftHeaderElementStyle.height = matrixHeight + "px";

    // Bound matrix's width by screen size.
    let matrixWidth, clientWidth;
    if (!width) {
      matrixWidth = this.leftHeader.getWidth() + 70;
      clientWidth = angular.element(this.element)[0][0].clientWidth - 40;
      if (matrixWidth > clientWidth) {
        matrixWidth = clientWidth;
      }
    } else {
      matrixWidth = width - this.controlsHeader.getAttributeColWidths() - 40;
    }

    this.leftHeaderElementStyle.width = matrixWidth + "px";

    // The matrix'x svg needs to be large enough to hold everything.
    this.leftHeaderSvg.transition()
      .duration(500).attr({
      width: this.leftHeader.getWidth(),
      height: this.leftHeader.getHeight()
    });

    // The divs need to expand/collapse depending on matrix size.
    this.controlsHeaderElement.transition()
      .duration(500)
      .style(this.controlsElementStyle);

    this.leftHeaderElement.transition()
      .duration(500)
      .style(this.leftHeaderElementStyle);

  }

}


