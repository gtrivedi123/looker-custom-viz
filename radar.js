// my_single_value_gauge.js

// This JavaScript file defines a custom Single-Value Gauge visualization for Looker.
// It is designed to have NO EXTERNAL JAVASCRIPT DEPENDENCIES,
// relying solely on native browser APIs (pure JavaScript and SVG manipulation).

// The main visualization object that Looker interacts with.
looker.plugins.visualizations.add({
  // Define the configurable options for the visualization. These options will appear
  // in the Looker visualization panel, allowing users to customize the chart.
  options: {
    // Gauge Range
    gauge_min: {
      type: "number",
      label: "Gauge Minimum Value",
      default: 0,
      min: -1000000000, // Allow large negative numbers
      max: 1000000000,
      step: 1,
      section: "Gauge Settings",
      order: 1
    },
    gauge_max: {
      type: "number",
      label: "Gauge Maximum Value",
      default: 100,
      min: -1000000000,
      max: 1000000000,
      step: 1,
      section: "Gauge Settings",
      order: 2
    },
    gauge_thickness: {
      type: "number",
      label: "Gauge Arc Thickness",
      default: 20,
      min: 5,
      max: 50,
      step: 1,
      section: "Gauge Settings",
      order: 3
    },

    // Colors
    gauge_color_background: {
      type: "array",
      label: "Background Arc Color",
      default: ["#E0E0E0"], // Light gray
      display: "color",
      section: "Colors",
      order: 1
    },
    gauge_color_fill: {
      type: "array",
      label: "Fill Arc Color",
      default: ["#4285F4"], // Google Blue
      display: "color",
      section: "Colors",
      order: 2
    },
    pointer_color: {
      type: "array",
      label: "Pointer Color",
      default: ["#EA4335"], // Google Red
      display: "color",
      section: "Colors",
      order: 3
    },
    value_label_color: {
      type: "array",
      label: "Value Label Color",
      default: ["#333333"],
      display: "color",
      section: "Colors",
      order: 4
    },
    min_max_label_color: {
      type: "array",
      label: "Min/Max Label Color",
      default: ["#666666"],
      display: "color",
      section: "Colors",
      order: 5
    },

    // Labels & Text
    title_text: {
      type: "string",
      label: "Chart Title",
      default: "KPI Progress",
      display: "text",
      section: "Labels",
      order: 1
    },
    title_display: {
      type: "boolean",
      label: "Display Title",
      default: true,
      display: "radio",
      section: "Labels",
      order: 2
    },
    value_label_size: {
      type: "number",
      label: "Value Label Font Size",
      default: 36,
      min: 10,
      max: 72,
      step: 1,
      section: "Labels",
      order: 3
    },
    // Note: D3 format string is not directly supported without D3.js.
    // This will now be a simple decimal places formatter.
    value_format_string: {
      type: "number",
      label: "Decimal Places",
      default: 1,
      min: 0,
      max: 10,
      step: 1,
      display: "number",
      section: "Labels",
      order: 4,
      description: "Number of decimal places for value labels."
    },
    show_min_max_labels: {
      type: "boolean",
      label: "Show Min/Max Labels",
      default: true,
      display: "radio",
      section: "Labels",
      order: 5
    },
    min_max_label_size: {
      type: "number",
      label: "Min/Max Label Font Size",
      default: 14,
      min: 8,
      max: 30,
      step: 1,
      section: "Labels",
      order: 6
    },
  },

  // The 'create' function is called once when the visualization is first mounted.
  create: function(element, config) {
    // Clear any existing content to ensure a clean slate for the visualization.
    element.innerHTML = '';

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.fontFamily = "Inter, sans-serif";
    element.appendChild(svg);

    // Create group element for the gauge
    const gaugeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gaugeGroup.setAttribute("class", "gauge-group");
    svg.appendChild(gaugeGroup);

    // Create title element
    const titleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    titleText.setAttribute("class", "chart-title");
    titleText.setAttribute("text-anchor", "middle");
    titleText.style.fontWeight = "bold";
    svg.appendChild(titleText);

    // Create error message container
    const errorContainer = document.createElement("div");
    errorContainer.setAttribute("class", "error-message");
    errorContainer.style.color = "red";
    errorContainer.style.textAlign = "center";
    errorContainer.style.padding = "10px";
    errorContainer.style.display = "none";
    element.appendChild(errorContainer);
  },

  // The 'updateAsync' function is called whenever the data, configuration, or size changes.
  updateAsync: function(data, element, config, queryResponse, details) {
    const svg = element.querySelector("svg");
    const gaugeGroup = svg.querySelector(".gauge-group");
    const titleText = svg.querySelector(".chart-title");
    const errorContainer = element.querySelector(".error-message");

    // Clear previous renderings
    while (gaugeGroup.firstChild) {
      gaugeGroup.removeChild(gaugeGroup.firstChild);
    }
    errorContainer.style.display = "none";
    errorContainer.textContent = "";

    // Data Validation
    const dimensions = queryResponse.fields.dimension_like;
    const measures = queryResponse.fields.measure_like;

    if (dimensions.length === 0 && measures.length === 0) {
      errorContainer.style.display = "block";
      errorContainer.textContent = "This visualization requires at least one measure or one dimension.";
      return;
    }
    if (data.length === 0) {
      errorContainer.style.display = "block";
      errorContainer.textContent = "No data returned for this query.";
      return;
    }
    if (data.length > 1) {
      errorContainer.style.display = "block";
      errorContainer.textContent = "This Single-Value Gauge visualization is designed for a single value. Please ensure your query returns only one row of data (e.g., by filtering to a single dimension value).";
      return;
    }
    if (measures.length !== 1) {
      errorContainer.style.display = "block";
      errorContainer.textContent = "This chart accepts exactly one measure.";
      return;
    }

    const rowData = data[0];
    const measureName = measures[0].name;
    let value = parseFloat(rowData[measureName] ? rowData[measureName].value : 0);

    // Chart Dimensions
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const gaugeRadius = Math.min(width, height) / 2 * 0.8;
    const gaugeThickness = config.gauge_thickness;
    const centerX = width / 2;
    // Adjusted centerY to move the gauge down, creating more space for the title
    const centerY = height / 2 + gaugeRadius * 0.4; // Increased offset from 0.2 to 0.4

    // Update title
    if (config.title_display) {
      titleText.setAttribute("x", centerX);
      // Adjusted title Y position for more space (moved further down)
      titleText.setAttribute("y", 60); // Increased from 40 to 60
      titleText.textContent = config.title_text;
    } else {
      titleText.textContent = "";
    }

    // Ensure value is within min/max range
    value = Math.max(config.gauge_min, Math.min(config.gauge_max, value));

    // Function to convert value to angle (radians)
    const valueToAngle = (val) => {
      const normalized = (val - config.gauge_min) / (config.gauge_max - config.gauge_min);
      // Changed range from -PI/2 to PI/2 (90 to 270 degrees)
      // to -PI to PI (0 to 360 degrees)
      return normalized * (2 * Math.PI) - Math.PI;
    };

    // Function to generate SVG arc path
    const getArcPath = (startAngle, endAngle, innerR, outerR) => {
      // For a full circle, the largeArcFlag should be 1 if the angle difference is > PI
      const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;

      const startXOuter = centerX + outerR * Math.cos(startAngle);
      const startYOuter = centerY + outerR * Math.sin(startAngle);
      const endXOuter = centerX + outerR * Math.cos(endAngle);
      const endYOuter = centerY + outerR * Math.sin(endAngle);

      const startXInner = centerX + innerR * Math.cos(endAngle);
      const startYInner = centerY + innerR * Math.sin(endAngle);
      const endXInner = centerX + innerR * Math.cos(startAngle);
      const endYInner = centerY + innerR * Math.sin(startAngle);

      let path = `M ${startXOuter} ${startYOuter}
                  A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endXOuter} ${endYOuter}
                  L ${startXInner} ${startYInner}
                  A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endXInner} ${endYInner}
                  Z`;
      return path;
    };

    // Background arc (full circle)
    const backgroundArcPath = getArcPath(
      -Math.PI, Math.PI, // Full circle from -180 to 180 degrees
      gaugeRadius - gaugeThickness, gaugeRadius
    );
    const backgroundArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    backgroundArc.setAttribute("d", backgroundArcPath);
    backgroundArc.setAttribute("fill", config.gauge_color_background[0]);
    gaugeGroup.appendChild(backgroundArc);

    // Fill arc (representing the current value)
    const fillArcPath = getArcPath(
      -Math.PI, valueToAngle(value), // Fill from -180 degrees to current value
      gaugeRadius - gaugeThickness, gaugeRadius
    );
    const fillArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    fillArc.setAttribute("d", fillArcPath);
    fillArc.setAttribute("fill", config.gauge_color_fill[0]);
    gaugeGroup.appendChild(fillArc);

    // --- Pointer (Needle) ---
    const pointerLength = gaugeRadius - gaugeThickness - 5;
    const pointerWidth = 8;
    const pointerAngleRad = valueToAngle(value);

    // Calculate pointer endpoints
    const pointerTipX = centerX + pointerLength * Math.cos(pointerAngleRad);
    const pointerTipY = centerY + pointerLength * Math.sin(pointerAngleRad);

    // Base of the pointer (at the center of the gauge)
    const baseAngle1 = pointerAngleRad - Math.PI / 2; // Perpendicular to pointer direction
    const baseAngle2 = pointerAngleRad + Math.PI / 2;

    const basePoint1X = centerX + (pointerWidth / 2) * Math.cos(baseAngle1);
    const basePoint1Y = centerY + (pointerWidth / 2) * Math.sin(baseAngle1);
    const basePoint2X = centerX + (pointerWidth / 2) * Math.cos(baseAngle2);
    const basePoint2Y = centerY + (pointerWidth / 2) * Math.sin(baseAngle2);

    const pointerPathString = `M ${basePoint1X} ${basePoint1Y} L ${pointerTipX} ${pointerTipY} L ${basePoint2X} ${basePoint2Y} Z`;

    const pointer = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pointer.setAttribute("d", pointerPathString);
    pointer.setAttribute("fill", config.pointer_color[0]);
    gaugeGroup.appendChild(pointer);

    // --- Value Label ---
    // Simple formatter for decimal places
    const formatValue = (val, decimals) => {
      if (typeof val !== 'number' || isNaN(val)) return '';
      return val.toFixed(decimals);
    };

    const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valueLabel.setAttribute("class", "value-label");
    valueLabel.setAttribute("x", centerX);
    valueLabel.setAttribute("y", centerY + gaugeRadius * 0.4);
    valueLabel.setAttribute("text-anchor", "middle");
    valueLabel.style.fontSize = `${config.value_label_size}px`;
    valueLabel.style.fontWeight = "bold";
    valueLabel.setAttribute("fill", config.value_label_color[0]);
    valueLabel.textContent = formatValue(value, config.value_format_string);
    gaugeGroup.appendChild(valueLabel);

    // --- Min/Max Labels ---
    if (config.show_min_max_labels) {
      const minMaxLabelY = centerY + gaugeRadius * 0.1;

      // Min label
      const minLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      minLabel.setAttribute("class", "min-label");
      minLabel.setAttribute("x", centerX - gaugeRadius + gaugeThickness / 2);
      minLabel.setAttribute("y", minMaxLabelY);
      minLabel.setAttribute("text-anchor", "start");
      minLabel.style.fontSize = `${config.min_max_label_size}px`;
      minLabel.setAttribute("fill", config.min_max_label_color[0]);
      minLabel.textContent = formatValue(config.gauge_min, config.value_format_string);
      gaugeGroup.appendChild(minLabel);

      // Max label
      const maxLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      maxLabel.setAttribute("class", "max-label");
      maxLabel.setAttribute("x", centerX + gaugeRadius - gaugeThickness / 2);
      maxLabel.setAttribute("y", minMaxLabelY);
      maxLabel.setAttribute("text-anchor", "end");
      maxLabel.style.fontSize = `${config.min_max_label_size}px`;
      maxLabel.setAttribute("fill", config.min_max_label_color[0]);
      maxLabel.textContent = formatValue(config.gauge_max, config.value_format_string);
      gaugeGroup.appendChild(maxLabel);
    }
  }
});
