/*global window Complex */

(function(){

	var CiSo = function() {
		this.components = [];
		this.nodeMap = {};				// a map of nodes: {"n1": [comp1, comp2], "n2": [comp2, comp3] ...}
		this.nodes = [];					// an array of all nodes
		this.dcVoltageSources = [];
		this.acVoltageSources = [];
		this.wires = [];
		this.gMatrix = [];
	};

	CiSo.prototype.getLinkedComponents = function (node) {
		return this.nodeMap[node];
	};

	CiSo.prototype.getDiagonalMatrixElement = function(node, freq) {
		var neighborComponents = this.nodeMap[node],
				matrixElement = new Complex(0,0),
				imp, i;
		for (i = neighborComponents.length - 1; i >= 0; i--) {
			imp = neighborComponents[i].getImpedance(freq);
			matrixElement = matrixElement.add(imp.inverse());
		}
		return matrixElement;
	};

	CiSo.prototype.getNodeIndexes = function(component) {
		var indexes = [];
		indexes[0] = this.nodes.indexOf(component.nodes[0]);
		indexes[1] = this.nodes.indexOf(component.nodes[1]);
		return indexes;
	};

	var Component = function(label, type, value, nodes) {
		this.label = label;
		this.type = type;
		this.value = value;
		this.nodes = nodes;
	};

	var twoPi = 2*Math.PI;

	Component.prototype.getImpedance = function(frequency) {
		var impedance = new Complex(0,0);
		if (this.type === "Resistor") {
			impedance.real = this.value;
			impedance.imag = 0;
		}
		else if (this.type == "Capacitor") {
			impedance.real = 0;
			impedance.imag = 1/(twoPi * frequency * this.value);
		}
		else if (this.type == "Inductor") {
			impedance.real = 0;
			impedance.imag = twoPi * frequency * this.value;
		}
		return impedance;
	};

	Component.prototype.getOffDiagonalMatrixElement = function(freq) {
		return this.getImpedance(freq).inverse();
	};

	var DCVoltageSource = function (label,voltage,pos_node,neg_node){
		this.label = label;
		this.voltage = voltage;
		this.pos_node = pos_node;
		this.neg_node = neg_node;
	};

	var ACVoltageSource = function (label,voltage,groundNodeLabel,voltageNodeLabel,frequency){
		this.voltage = voltage;
		this.groundNodeLabel = groundNodeLabel;
		this.voltageNodeLabel = voltageNodeLabel;
		this.frequency = frequency;
	};

	CiSo.prototype.addComponent = function (label,type,value,nodeLabels) {
		var component = new Component(label,type,value,nodeLabels), // Make a new component with the right properties
				i, ii, node;

		// Push the new component onto the components array
		this.components.push(component);

		// push the component into the nodes hash
		for (i=0, ii=nodeLabels.length; i<ii; i++) {
			node = nodeLabels[i];
			if (!this.nodeMap[node]) {
				this.nodeMap[node] = [];
				this.nodes.push(node);
			}
			this.nodeMap[node].push(component);
		}
	};

	CiSo.prototype.addDCVoltageSource = function (label,voltage,positiveNodeLabel,negativeNodeLabel) {
		var source = new DCVoltageSource(label,voltage,positiveNodeLabel,negativeNodeLabel);
		this.dcVoltageSources.push(source);
	};

	CiSo.prototype.addACVoltageSource = function (label,voltage,groundNodeLabel,voltageNodeLabel,frequency) {
		var source = new ACVoltageSource(label,voltage,groundNodeLabel,voltageNodeLabel,frequency);
		this.acVoltageSources.push(source);
	};

	CiSo.prototype.fillGMatrix = function (){
		var source, frequency,
				cZero,
				i, j,
				rowIndex, colIndex;
		if (this.acVoltageSources.length > 0){
			source = this.acVoltageSources[0];
			frequency = source.frequency;
		}
		cZero = new Complex(0,0);
		for (i = 0; i < this.nodes.length + 1; i++) {
			this.gMatrix [i] = new Array(this.nodes.length + 1);
		}
		for (i = 0; i < this.nodes.length + 1; i++) {
			for (j = 0; j < this.nodes.length + 1; j++) {
				this.gMatrix[i][j] = cZero;
			}
		}
		for (i = 0; i < this.nodes.length; i++){
			this.gMatrix[i][i] = this.getDiagonalMatrixElement(this.nodes[i], frequency);
		}
		for (i = 0; i < this.components.length; i++) {
			rowIndex = this.getNodeIndexes(this.components[i])[0];
			colIndex = this.getNodeIndexes(this.components[i])[1];
			this.gMatrix[rowIndex][colIndex] = this.components[i].getOffDiagonalMatrixElement(frequency);
		}
	};

	CiSo.prototype.augmentGMatrix = function (){
		if (this.acVoltageSources.length === 0) return;

		var one = new Complex(1,0),
				source = this.acVoltageSources[0],
				frequency = source.frequency,
				voltageNodeLabel = source.voltageNodeLabel,
				groundNodeLabel = source.groundNodeLabel,
				voltageNodeIndex = this.nodes.indexOf(voltageNodeLabel),
				groundNodeIndex = this.nodes.indexOf(groundNodeLabel);

		this.gMatrix[this.nodes.length][voltageNodeIndex] = one;
		this.gMatrix[voltageNodeIndex][this.nodes.length] = one;
	};

	window.CiSo = CiSo;
})();