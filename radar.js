// my_single_value_gauge.js

// This JavaScript file defines a custom Single-Value Gauge visualization for Looker.
// It uses D3.js (version 7) to render the gauge.
// Ensure D3.js is loaded as a dependency in your manifest.lkml file.

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
    value_format_string: {
      type: "string",
      label: "Value Format (D3 Format)",
      default: ".1f", // Example: 12.3
      display: "text",
      section: "Labels",
      order: 4,
      placeholder: ".1f, $, .0%, (e.g., '.1f', '$.2f', '.0%')"
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
  // It's used to set up the basic SVG container and any static elements.
  create: function(element, config) {
    // Clear any existing content to ensure a clean slate for the visualization.
    element.innerHTML = '';

    // Append an SVG element to the provided 'element' (the visualization container).
    // This SVG will hold all the chart elements.
    const svg = d3.select(element)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("font-family", "Inter, sans-serif"); // Apply a consistent font

    // Append a group element for the gauge. This group will be translated to the center.
    svg.append("g").attr("class", "gauge-group");

    // Add a title element for the chart. Its text will be updated in updateAsync.
    svg.append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .style("font-weight", "bold");

    // Add a container for error messages.
    const errorContainer = d3.select(element).append("div")
      .attr("class", "error-message")
      .style("color", "red")
      .style("text-align", "center")
      .style("padding", "10px")
      .style("display", "none"); // Hidden by default
  },

  // The 'updateAsync' function is called whenever the data, configuration, or size changes.
  // This is where the main rendering logic for the gauge resides.
  updateAsync: function(data, element, config, queryResponse, details) {
    // Select the error message container and hide it initially.
    const errorContainer = d3.select(element).select(".error-message");
    errorContainer.style("display", "none").text("");

    // Looker's data structure: queryResponse.fields contains metadata about dimensions/measures.
    // data contains the actual row data.
    const dimensions = queryResponse.fields.dimension_like;
    const measures = queryResponse.fields.measure_like;

    // --- Data Validation ---
    if (dimensions.length === 0 && measures.length === 0) {
      errorContainer.style("display", "block").text("This visualization requires at least one measure or one dimension.");
      d3.select(element).select(".gauge-group").selectAll("*").remove(); // Clear chart
      d3.select(element).select(".chart-title").text(""); // Clear title
      return;
    }
    if (data.length === 0) {
      errorContainer.style("display", "block").text("No data returned for this query.");
      d3.select(element).select(".gauge-group").selectAll("*").remove(); // Clear chart
      d3.select(element).select(".chart-title").text(""); // Clear title
      return;
    }
    if (data.length > 1) {
      errorContainer.style("display", "block").text("This Single-Value Gauge visualization is designed for a single value. Please ensure your query returns only one row of data (e.g., by filtering to a single dimension value).");
      d3.select(element).select(".gauge-group").selectAll("*").remove(); // Clear chart
      d3.select(element).select(".chart-title").text(""); // Clear title
      return;
    }
    if (measures.length !== 1) {
      errorContainer.style("display", "block").text("This chart accepts exactly one measure.");
      d3.select(element).select(".gauge-group").selectAll("*").remove(); // Clear chart
      d3.select(element).select(".chart-title").text(""); // Clear title
      return;
    }

    // Extract the single data row and the single measure.
    const rowData = data[0];
    const measureName = measures[0].name;
    let value = rowData[measureName] ? parseFloat(rowData[measureName].value) : 0;

    // --- Chart Dimensions and Setup ---
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const svg = d3.select(element).select("svg");
    const gaugeGroup = svg.select(".gauge-group");

    // Clear previous renderings to prevent overlaps
    gaugeGroup.selectAll("*").remove();

    // Update chart title position and text
    if (config.title_display) {
      svg.select(".chart-title")
        .attr("x", width / 2)
        .attr("y", 30) // Position title at the top
        .text(config.title_text);
    } else {
      svg.select(".chart-title").text(""); // Clear title if not displayed
    }

    // Gauge dimensions
    const gaugeRadius = Math.min(width, height) / 2 * 0.8; // Radius of the gauge arc
    const gaugeThickness = config.gauge_thickness;
    const centerX = width / 2;
    const centerY = height / 2 + gaugeRadius * 0.1; // Adjust Y for a slightly lower center

    // Arc generator for the gauge
    const arc = d3.arc()
      .innerRadius(gaugeRadius - gaugeThickness)
      .outerRadius(gaugeRadius)
      .startAngle(-Math.PI / 2) // Start at 9 o'clock
      .endAngle(Math.PI / 2) // End at 3 o'clock
      .cornerRadius(gaugeThickness / 2); // Rounded corners for the arc

    // Scale for mapping data values to angles
    const angleScale = d3.scaleLinear()
      .domain([config.gauge_min, config.gauge_max])
      .range([-Math.PI / 2, Math.PI / 2]); // Maps to the semi-circle

    // Ensure value is within min/max range for rendering
    value = Math.max(config.gauge_min, Math.min(config.gauge_max, value));

    // Background arc
    gaugeGroup.append("path")
      .attr("d", arc)
      .attr("fill", config.gauge_color_background[0])
      .attr("transform", `translate(${centerX},${centerY})`);

    // Fill arc (representing the current value)
    const fillArc = d3.arc()
      .innerRadius(gaugeRadius - gaugeThickness)
      .outerRadius(gaugeRadius)
      .startAngle(-Math.PI / 2)
      .endAngle(angleScale(value)) // Ends at the angle corresponding to the current value
      .cornerRadius(gaugeThickness / 2);

    gaugeGroup.append("path")
      .attr("d", fillArc)
      .attr("fill", config.gauge_color_fill[0])
      .attr("transform", `translate(${centerX},${centerY})`);

    // --- Pointer (Needle) ---
    const pointerLength = gaugeRadius - gaugeThickness - 5; // Length of the pointer
    const pointerWidth = 8; // Width of the pointer base

    // Calculate pointer angle
    const pointerAngle = angleScale(value);

    // Define pointer path (triangle shape)
    const pointerPath = d3.path();
    pointerPath.moveTo(0, -pointerWidth / 2);
    pointerPath.lineTo(pointerLength, 0);
    pointerPath.lineTo(0, pointerWidth / 2);
    pointerPath.closePath();

    gaugeGroup.append("path")
      .attr("d", pointerPath.toString())
      .attr("fill", config.pointer_color[0])
      .attr("transform", `translate(${centerX},${centerY}) rotate(${pointerAngle * 180 / Math.PI})`);

    // --- Value Label ---
    const formatValue = d3.format(config.value_format_string);
    gaugeGroup.append("text")
      .attr("class", "value-label")
      .attr("x", centerX)
      .attr("y", centerY + gaugeRadius * 0.4) // Position below the gauge
      .attr("text-anchor", "middle")
      .style("font-size", `${config.value_label_size}px`)
      .style("font-weight", "bold")
      .attr("fill", config.value_label_color[0])
      .text(formatValue(value));

    // --- Min/Max Labels ---
    if (config.show_min_max_labels) {
      const minMaxLabelY = centerY + gaugeRadius * 0.1; // Position slightly below center

      // Min label
      gaugeGroup.append("text")
        .attr("class", "min-label")
        .attr("x", centerX - gaugeRadius + gaugeThickness / 2) // Left side
        .attr("y", minMaxLabelY)
        .attr("text-anchor", "start")
        .style("font-size", `${config.min_max_label_size}px`)
        .attr("fill", config.min_max_label_color[0])
        .text(formatValue(config.gauge_min));

      // Max label
      gaugeGroup.append("text")
        .attr("class", "max-label")
        .attr("x", centerX + gaugeRadius - gaugeThickness / 2) // Right side
        .attr("y", minMaxLabelY)
        .attr("text-anchor", "end")
        .style("font-size", `${config.min_max_label_size}px`)
        .attr("fill", config.min_max_label_color[0])
        .text(formatValue(config.gauge_max));
    }
  }
});
