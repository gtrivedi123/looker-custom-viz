// radial_gauge_viz.js
// This file defines a custom Radial Gauge visualization for Looker.
// It adapts the provided React component logic to Looker's Visualization API.
//
// Dependencies:
// - d3.js (version 7.x)
// - ssf.js (for Excel-style number formatting)
//
// Ensure these are loaded via CDN in your manifest.lkml file.

// --- Helper Functions (adapted from original code) ---

/**
 * Linearly maps a value from one range to another.
 * @param {number} value - The value to map.
 * @param {number} inMin - The minimum value of the input range.
 * @param {number} inMax - The maximum value of the input range.
 * @param {number} outMin - The minimum value of the output range.
 * @param {number} outMax - The maximum value of the output range.
 * @returns {number} The mapped value.
 */
function mapBetween(value, inMin, inMax, outMin, outMax) {
  // Handle cases where input range is zero to prevent division by zero
  if (inMax - inMin === 0) {
    return outMin; // Or handle as an error, depending on desired behavior
  }
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Wraps text to fit within a specified width by adding tspan elements.
 * @param {d3.Selection} text - The D3 selection of the text element to wrap.
 * @param {number} width - The maximum width for the text.
 */
function wrap(text, width) {
  text.each(function () {
    const textElement = d3.select(this);
    const words = textElement.text().split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.4; // ems
    const y = textElement.attr('y') || 0; // Default to 0 if not set
    const x = textElement.attr('x') || 0; // Default to 0 if not set
    const dy = parseFloat(textElement.attr('dy')) || 0; // Default to 0 if not set
    let tspan = textElement
      .text(null)
      .append('tspan')
      .attr('x', x)
      .attr('y', y)
      .attr('dy', dy + 'em');

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = textElement
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', ++lineNumber * lineHeight + dy + 'em')
          .text(word);
      }
    }
  });
}

// --- Looker Custom Visualization Definition ---
looker.plugins.visualizations.add({
  // Define the configurable options for the visualization. These will appear
  // in the Looker visualization panel for user customization.
  options: {
    // Gauge appearance
    gauge_background: {
      type: "array",
      label: "Gauge Background Color",
      default: ["#E0E0E0"], // Light gray
      display: "color",
    },
    cutout: {
      type: "number",
      label: "Inner Cutout (%)",
      default: 50,
      min: 0,
      max: 90,
      step: 1,
      display: "range",
    },
    angle: {
      type: "number",
      label: "Gauge Angle (Degrees)",
      default: 180, // Full half-circle
      min: 90,
      max: 270,
      step: 1,
      display: "range",
    },
    arm: {
      type: "number",
      label: "Arm Extension (px)",
      default: 10,
      min: 0,
      max: 50,
      step: 1,
      display: "range",
    },
    arm_weight: {
      type: "number",
      label: "Arm Weight (px)",
      default: 2,
      min: 1,
      max: 10,
      step: 1,
      display: "range",
    },

    // Gauge Fill
    gauge_fill_type: {
      type: "string",
      label: "Fill Type",
      default: "progress",
      display: "select",
      values: [
        { "Progress": "progress" },
        { "Segmented": "segment" },
        { "Progress Gradient": "progress-gradient" },
      ]
    },
    color: { // Main fill color for 'progress' type
      type: "array",
      label: "Progress Fill Color",
      default: ["#4285F4"], // Google Blue
      display: "color",
    },
    fill_colors: { // Colors for 'segment' or 'progress-gradient'
      type: "array",
      label: "Segment/Gradient Colors",
      default: ["#EA4335", "#FBBC04", "#34A853"], // Red, Yellow, Green
      display: "colors",
    },

    // Value Labels (Min/Max Range)
    range_min: {
      type: "number",
      label: "Range Min Value",
      default: 0,
      display: "number",
    },
    range_max: {
      type: "number",
      label: "Range Max Value",
      default: 100,
      display: "number",
    },
    range_formatting: {
      type: "string",
      label: "Range Value Format (SSF)",
      default: "", // e.g., "#,##0.00"
      display: "text",
    },
    range_color: {
      type: "array",
      label: "Range Label Color",
      default: ["#707070"],
      display: "color",
    },
    range_x: {
      type: "number",
      label: "Range Label X Offset (em)",
      default: 1.5,
      min: -5,
      max: 5,
      step: 0.1,
      display: "range",
    },
    range_y: {
      type: "number",
      label: "Range Label Y Offset (em)",
      default: 0,
      min: -5,
      max: 5,
      step: 0.1,
      display: "range",
    },
    label_font: {
      type: "number",
      label: "Range Label Font Size (vw/vh)",
      default: 2.5,
      min: 1,
      max: 5,
      step: 0.1,
      display: "range",
    },

    // Spinner (Needle)
    spinner_type: {
      type: "string",
      label: "Spinner Type",
      default: "auto",
      display: "select",
      values: [
        { "Auto": "auto" },
        { "Spinner (Circle)": "spinner" },
        { "Needle (Triangle)": "needle" },
        { "Inner (Arc)": "inner" },
      ]
    },
    spinner: { // Length multiplier for spinner
      type: "number",
      label: "Spinner Length Multiplier",
      default: 100,
      min: 50,
      max: 200,
      step: 1,
      display: "range",
    },
    spinner_background: {
      type: "array",
      label: "Spinner Color",
      default: ["#282828"], // Dark gray
      display: "color",
    },
    spinner_weight: {
      type: "number",
      label: "Spinner Weight (px)",
      default: 5,
      min: 1,
      max: 20,
      step: 1,
      display: "range",
    },

    // Value Label (Center)
    value_label_type: {
      type: "string",
      label: "Center Label Type",
      default: "both",
      display: "select",
      values: [
        { "Value Only": "value" },
        { "Label Only": "label" },
        { "Dimension Only": "dim" },
        { "Value & Label": "both" },
        { "Value & Dimension": "dboth" },
        { "No Label": "nolabel" },
      ]
    },
    value_label_font: {
      type: "number",
      label: "Center Label Font Size (vw/vh)",
      default: 5,
      min: 2,
      max: 10,
      step: 0.1,
      display: "range",
    },
    value_label_padding: {
      type: "number",
      label: "Center Label Padding (%)",
      default: 10,
      min: 0,
      max: 50,
      step: 1,
      display: "range",
    },

    // Target Line
    target_source: {
      type: "string",
      label: "Target Source",
      default: "off",
      display: "select",
      values: [
        { "Off": "off" },
        { "From Measure 2": "measure2" }, // Assumes second measure is target
        { "Hardcoded Value": "hardcoded" },
      ]
    },
    hardcoded_target_value: {
      type: "number",
      label: "Hardcoded Target Value",
      default: 75,
      display: "number",
    },
    target_label_type: {
      type: "string",
      label: "Target Label Type",
      default: "both",
      display: "select",
      values: [
        { "Value Only": "value" },
        { "Label Only": "label" },
        { "Dimension Only": "dim" },
        { "Value & Label": "both" },
        { "Value & Dimension": "dboth" },
        { "No Label": "nolabel" },
      ]
    },
    target_background: {
      type: "array",
      label: "Target Line Color",
      default: ["#FF0000"], // Red
      display: "color",
    },
    target_weight: {
      type: "number",
      label: "Target Line Weight (px)",
      default: 5,
      min: 1,
      max: 10,
      step: 1,
      display: "range",
    },
    target_length: {
      type: "number",
      label: "Target Dash Length (px)",
      default: 5,
      min: 1,
      max: 20,
      step: 1,
      display: "range",
    },
    target_gap: {
      type: "number",
      label: "Target Dash Gap (px)",
      default: 5,
      min: 1,
      max: 20,
      step: 1,
      display: "range",
    },
    target_label_padding: {
      type: "number",
      label: "Target Label Padding (%)",
      default: 1.1, // Multiplier for radius
      min: 0.5,
      max: 2.0,
      step: 0.1,
      display: "range",
    },
    target_label_font: {
      type: "number",
      label: "Target Label Font Size (vw/vh)",
      default: 2,
      min: 1,
      max: 4,
      step: 0.1,
      display: "range",
    },

    // General
    chart_title: {
      type: "string",
      label: "Chart Title",
      default: "Radial Gauge",
      display: "text",
    },
    wrap_width: { // For wrapping text labels
      type: "number",
      label: "Text Wrap Width (px)",
      default: 100,
      min: 50,
      max: 300,
      step: 10,
      display: "range",
    }
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

    // Append a group element for the radar chart itself.
    // This group will be translated to the center of the SVG.
    svg.append("g").attr("class", "gauge-group");

    // Add a title element for the chart. Its text will be updated in updateAsync.
    svg.append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .style("font-weight", "bold");

    // Add a container for error messages.
    d3.select(element).append("div")
      .attr("class", "error-message")
      .style("color", "red")
      .style("text-align", "center")
      .style("padding", "10px")
      .style("display", "none"); // Hidden by default
  },

  // The 'updateAsync' function is called whenever the data, configuration, or size changes.
  // This is where the main rendering logic for the radar chart resides.
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
      errorContainer.style("display", "block").text("This visualization requires at least one dimension or measure.");
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
      errorContainer.style("display", "block").text("This Radial Gauge visualization is designed for a single item. Please ensure your query returns only one row of data (e.g., by filtering to a single dimension value).");
      d3.select(element).select(".gauge-group").selectAll("*").remove(); // Clear chart
      d3.select(element).select(".chart-title").text(""); // Clear title
      return;
    }

    // Extract the single data row.
    const rowData = data[0];

    // --- Map Looker Data/Config to Props-like Structure ---
    // This maps the Looker data and user-defined config to the 'props' structure
    // that the original code expected.
    const primaryMeasure = measures[0];
    const primaryDimension = dimensions[0];

    // Get the primary value and its formatted/rendered version
    const value = rowData[primaryMeasure.name] ? parseFloat(rowData[primaryMeasure.name].value) : 0;
    const value_rendered = rowData[primaryMeasure.name] ? rowData[primaryMeasure.name].rendered : SSF.format(primaryMeasure.value_format || "", value);
    const value_label = primaryMeasure.label_short || primaryMeasure.label || primaryMeasure.name;
    const value_dimension = primaryDimension ? (primaryDimension.label_short || primaryDimension.label || primaryDimension.name) : '';
    const value_links = rowData[primaryMeasure.name] ? rowData[primaryMeasure.name].links : [];

    // Determine target value
    let target = null;
    let target_rendered = '';
    let target_label = '';
    let target_dimension = '';

    if (config.target_source === 'measure2' && measures.length > 1) {
      const secondMeasure = measures[1];
      target = rowData[secondMeasure.name] ? parseFloat(rowData[secondMeasure.name].value) : 0;
      target_rendered = rowData[secondMeasure.name] ? rowData[secondMeasure.name].rendered : SSF.format(secondMeasure.value_format || "", target);
      target_label = secondMeasure.label_short || secondMeasure.label || secondMeasure.name;
      target_dimension = primaryDimension ? (primaryDimension.label_short || primaryDimension.label || primaryDimension.name) : '';
    } else if (config.target_source === 'hardcoded') {
      target = config.hardcoded_target_value;
      target_rendered = SSF.format(config.range_formatting || "", target); // Use range formatting for hardcoded target
      target_label = 'Target';
      target_dimension = '';
    }

    // Combine all relevant data and config into a single 'props' object for drawing
    const currentProps = {
      w: element.offsetWidth,
      h: element.offsetHeight,
      value: value,
      value_rendered: value_rendered,
      value_label: value_label,
      value_dimension: primaryDimension ? (rowData[primaryDimension.name] ? rowData[primaryDimension.name].rendered : '') : '', // Rendered dimension value
      value_links: value_links,
      target: target,
      target_rendered: target_rendered,
      target_label: target_label,
      target_dimension: target_dimension,
      range: [config.range_min, config.range_max],
      ...config // Spread all user-defined options directly
    };

    // --- Drawing Logic (adapted from original drawRadial function) ---

    const limiting_aspect = currentProps.w < currentProps.h ? 'vw' : 'vh';
    const radius = 0.4 * Math.min(currentProps.w, currentProps.h);
    const cutoutCalc = radius * (currentProps.cutout / 100);
    const valueLabelCalc = radius * (currentProps.value_label_padding / 100);
    const armLength = radius + currentProps.arm;
    const gaugeAngle = (currentProps.angle * Math.PI * 2) / 360;
    const spinnerStandard = currentProps.spinner / 150;
    const spinnerLength =
      radius * spinnerStandard < cutoutCalc
        ? cutoutCalc
        : radius * spinnerStandard;

    // Select the SVG and the main group
    const svg = d3.select(element).select('svg');
    const g = svg.select('.gauge-group');

    // Update SVG dimensions and viewBox
    svg
      .attr('width', currentProps.w)
      .attr('height', currentProps.h)
      .attr('viewBox', `${currentProps.w / -2} ${currentProps.h / -2} ${currentProps.w} ${currentProps.h}`);

    // Clear previous elements within the gauge group
    g.selectAll('*').remove();

    // create the gauge background
    const generator = d3
      .arc()
      .innerRadius(cutoutCalc)
      .outerRadius(radius)
      .startAngle(-gaugeAngle)
      .endAngle(gaugeAngle);
    g.append('path')
      .attr('class', 'gauge_background')
      .attr('d', generator)
      .attr('fill', currentProps.gauge_background[0]) // Use [0] for color array
      .attr('stroke', 'none');

    // find how much of the gauge is filled
    // then fill the gauge
    const proportion = mapBetween(
      currentProps.value,
      currentProps.range[0],
      currentProps.range[1],
      0,
      1
    );
    const value_standard = currentProps.angle * 2 * proportion - currentProps.angle;
    const valueAngle = (value_standard * Math.PI * 2) / 360;

    if (currentProps.gauge_fill_type === 'progress') {
      const fill_generator = d3
        .arc()
        .innerRadius(cutoutCalc)
        .outerRadius(radius)
        .startAngle(-gaugeAngle)
        .endAngle(valueAngle);
      g.append('path')
        .attr('class', 'gaugeFill')
        .attr('d', fill_generator)
        .attr('fill', currentProps.color[0]) // Use [0] for color array
        .attr('stroke', currentProps.color[0])
        .attr('stroke-width', '1px');
    } else if (currentProps.gauge_fill_type === 'segment') {
      const len = currentProps.fill_colors.length;
      currentProps.fill_colors.map((d, i) => {
        const Jpro = i / len;
        const Jstan = currentProps.angle * 2 * Jpro - currentProps.angle;
        const JiAngle = (Jstan * Math.PI * 2) / 360;
        const Kpro = (i + 1) / len;
        const Kstan = currentProps.angle * 2 * Kpro - currentProps.angle;
        const KiAngle = (Kstan * Math.PI * 2) / 360;
        const fill_generator = d3
          .arc()
          .innerRadius(cutoutCalc)
          .outerRadius(radius)
          .startAngle(JiAngle)
          .endAngle(KiAngle);
        g.append('path')
          .attr('class', `gaugeFill-${i}`)
          .attr('d', fill_generator)
          .attr('fill', currentProps.fill_colors[i])
          .attr('stroke', currentProps.fill_colors[i])
          .attr('stroke-width', '1px');
      });
    } else if (currentProps.gauge_fill_type === 'progress-gradient') {
      const divisor = 1 / currentProps.fill_colors.length;
      let which = Math.floor(proportion / divisor);
      which = proportion >= 1 ? currentProps.fill_colors.length - 1 : which;
      which = Math.max(0, Math.min(which, currentProps.fill_colors.length - 1)); // Ensure index is within bounds

      const fill_generator = d3
        .arc()
        .innerRadius(cutoutCalc)
        .outerRadius(radius)
        .startAngle(-gaugeAngle)
        .endAngle(valueAngle);
      g.append('path')
        .attr('class', 'gaugeFill')
        .attr('d', fill_generator)
        .attr('fill', currentProps.fill_colors[which])
        .attr('stroke', currentProps.fill_colors[which])
        .attr('stroke-width', '1px');
    }

    // creates a left arm border and label
    const leftArmArc = d3
      .arc()
      .innerRadius(cutoutCalc * 0.97)
      .outerRadius(armLength)
      .startAngle(-gaugeAngle)
      .endAngle(-gaugeAngle);
    const leftArmSel = g
      .append('path')
      .attr('class', 'leftArmArc')
      .attr('d', leftArmArc)
      .attr('fill', currentProps.gauge_background[0])
      .attr('stroke', currentProps.gauge_background[0])
      .attr('stroke-width', currentProps.arm_weight / 5);

    const formattedRangeMin = currentProps.range_formatting === '' || !SSF ? currentProps.range[0] : SSF.format(currentProps.range_formatting, currentProps.range[0]);
    g.append('text')
      .attr('class', 'minLabel')
      .text(formattedRangeMin)
      .style('font-size', `${currentProps.label_font}${limiting_aspect}`)
      .style('font-family', 'Arial, Helvetica, sans-serif')
      .style('fill', currentProps.range_color[0])
      .style('font-weight', 'bold')
      .attr('dx', `${-currentProps.range_x}em`)
      .attr('dy', `${-1 * currentProps.range_y}em`)
      .attr(
        'transform',
        `translate(${leftArmSel.node().getBBox().x} ${
          0 +
          (currentProps.angle < 90 ? -1 : 1) * leftArmSel.node().getBBox().height -
          (currentProps.angle > 90 ? 90 - currentProps.angle : 0)
        })`
      );

    // creates a right arm border and label
    const rightArmArc = d3
      .arc()
      .innerRadius(cutoutCalc * 0.97)
      .outerRadius(armLength)
      .startAngle(gaugeAngle)
      .endAngle(gaugeAngle);
    const rightArmSel = g
      .append('path')
      .attr('class', 'rightArmArc')
      .attr('d', rightArmArc)
      .attr('fill', currentProps.gauge_background[0])
      .attr('stroke', currentProps.gauge_background[0])
      .attr('stroke-width', currentProps.arm_weight / 5);

    const formattedRangeMax = currentProps.range_formatting === '' || !SSF ? currentProps.range[1] : SSF.format(currentProps.range_formatting, currentProps.range[1]);
    g.append('text')
      .attr('class', 'maxLabel')
      .text(formattedRangeMax)
      .style('font-size', `${currentProps.label_font}${limiting_aspect}`)
      .style('font-family', 'Arial, Helvetica, sans-serif')
      .style('fill', currentProps.range_color[0])
      .style('font-weight', 'bold')
      .attr('dx', `${currentProps.range_x - 1}em`)
      .attr('dy', `${-1 * currentProps.range_y}em`)
      .attr(
        'transform',
        `translate(${
          rightArmSel.node().getBBox().x + rightArmSel.node().getBBox().width
        } ${
          0 +
          (currentProps.angle < 90 ? -1 : 1) * rightArmSel.node().getBBox().height -
          (currentProps.angle > 90 ? 90 - currentProps.angle : 0)
        })`
      );

    // create the spinner and point to the value
    function getSpinnerArm(spinnerType) {
      if (spinnerType === 'spinner') {
        return d3
          .arc()
          .innerRadius(0)
          .outerRadius(spinnerLength)
          .startAngle(valueAngle)
          .endAngle(valueAngle);
      } else if (spinnerType === 'needle') {
        const _in = valueAngle - Math.PI / 2;
        const _im = _in - (55 * Math.PI) / 60;
        const _ip = _in + (55 * Math.PI) / 60;

        const topX = spinnerLength * Math.cos(_in);
        const topY = spinnerLength * Math.sin(_in);

        const leftX = spinnerLength * 0.1 * Math.cos(_im);
        const leftY = spinnerLength * 0.1 * Math.sin(_im);

        const rightX = spinnerLength * 0.1 * Math.cos(_ip);
        const rightY = spinnerLength * 0.1 * Math.sin(_ip);

        return (
          d3.line()([
            [topX, topY],
            [leftX, leftY],
            [rightX, rightY],
          ]) + 'Z'
        );
      } else if (spinnerType === 'auto') {
        const _in = valueAngle - Math.PI / 2;
        const _im = _in - (55 * Math.PI) / 60;
        const _ip = _in + (55 * Math.PI) / 60;

        const topX = spinnerLength * Math.cos(_in);
        const topY = spinnerLength * Math.sin(_in);

        const leftX = spinnerLength * 0.15 * Math.cos(_im);
        const leftY = spinnerLength * 0.15 * Math.sin(_im);

        const rightX = spinnerLength * 0.15 * Math.cos(_ip);
        const rightY = spinnerLength * 0.15 * Math.sin(_ip);

        return (
          d3.line()([
            [topX, topY],
            [leftX, leftY],
            [rightX, rightY],
          ]) + 'Z'
        );
      } else if (spinnerType === 'inner') {
        return d3
          .arc()
          .innerRadius(cutoutCalc)
          .outerRadius(spinnerLength)
          .startAngle(valueAngle)
          .endAngle(valueAngle);
      }
      return null; // Should not happen with valid spinnerType
    }
    const spinnerArm = getSpinnerArm(currentProps.spinner_type);

    const spinnerArmSel = g
      .append('path')
      .attr('class', 'spinnerArm')
      .attr('d', spinnerArm)
      .attr('fill', currentProps.spinner_background[0])
      .attr('stroke', currentProps.spinner_background[0])
      .attr('stroke-width', currentProps.spinner_weight / 10);

    function getSpinnerCore(spinnerType) {
      if (spinnerType === 'spinner') {
        return g
          .append('circle')
          .attr('class', 'spinnerCenter')
          .attr('r', currentProps.spinner_weight / 10)
          .style('fill', currentProps.spinner_background[0]);
      } else if (spinnerType === 'needle' || spinnerType === 'inner') {
        return null;
      } else if (spinnerType === 'auto') {
        return g
          .append('circle')
          .attr('class', 'spinnerCenter')
          .attr('r', currentProps.spinner_weight / 2)
          .style('stroke', currentProps.gauge_background[0])
          .style('stroke-width', '2px')
          .style('fill', '#FFF');
      }
      return null; // Should not happen
    }
    const spinnerCore = getSpinnerCore(currentProps.spinner_type);

    spinnerArmSel.on('click', function (event) { // Use 'event' parameter
      LookerCharts.Utils.openDrillMenu({
        links: currentProps.value_links,
        event: event,
      });
    });

    // find what percent of the gauge is equivalent to the target value
    if (currentProps.target_source !== 'off' && currentProps.target !== null) {
      const target_proportion = mapBetween(
        currentProps.target,
        currentProps.range[0],
        currentProps.range[1],
        0,
        1
      );
      const tarNeg = target_proportion < 0.5 ? -1 : 1;
      const target_standard = currentProps.angle * 2 * target_proportion - currentProps.angle;
      const targetAngle = (target_standard * Math.PI * 2) / 360;
      const targetSpinner = d3
        .arc()
        .innerRadius(cutoutCalc)
        .outerRadius(radius)
        .startAngle(targetAngle)
        .endAngle(targetAngle);
      const targetLine = g
        .append('path')
        .attr('class', 'targetSpinner')
        .attr('d', targetSpinner)
        .attr('stroke', currentProps.target_background[0])
        .attr('stroke-width', currentProps.target_weight / 10)
        .attr('stroke-dasharray', `${currentProps.target_length} ${currentProps.target_gap}`);

      // label the target spinner value
      const targetLabelArc = d3
        .arc()
        .innerRadius(radius * currentProps.target_label_padding)
        .outerRadius(radius * currentProps.target_label_padding)
        .startAngle(targetAngle)
        .endAngle(targetAngle);
      const targetLabelLine = g
        .append('path')
        .attr('class', 'targetLabel')
        .attr('d', targetLabelArc);

      let targetValueTextContent = '';
      if (currentProps.target_label_type === 'both') {
        targetValueTextContent = `${currentProps.target_rendered} ${currentProps.target_label}`;
      } else if (currentProps.target_label_type === 'dboth') {
        targetValueTextContent = `${currentProps.target_rendered} ${currentProps.target_dimension}`;
      } else if (currentProps.target_label_type === 'dim') {
        targetValueTextContent = `${currentProps.target_dimension}`;
      } else if (currentProps.target_label_type === 'value') {
        targetValueTextContent = `${currentProps.target_rendered}`;
      } else if (currentProps.target_label_type === 'label') {
        targetValueTextContent = `${currentProps.target_label}`;
      }

      if (currentProps.target_label_type !== 'nolabel' && targetValueTextContent !== '') {
        const targetValueText = g
          .append('text')
          .attr('class', 'targetValue')
          .text(targetValueTextContent)
          .style('font-size', `${currentProps.target_label_font}${limiting_aspect}`)
          .style('font-family', 'Arial, Helvetica, sans-serif')
          .attr('dy', '.35em');

        targetValueText
          .attr('x', () => {
            if (tarNeg > 0) {
              return targetLabelLine.node().getBBox().x;
            } else {
              return (
                targetLabelLine.node().getBBox().x -
                targetValueText.node().getBBox().width
              );
            }
          })
          .attr('y', () => {
            return targetLabelLine.node().getBBox().y;
          });
        // .call(wrap, currentProps.wrap_width); // Apply wrap if needed
      }
    }

    // label the value
    let drillTop = null;
    let drillBottom = null;

    if (currentProps.value_label_type === 'value') {
      const valueText = g
        .append('text')
        .attr('class', 'gaugeValue')
        .text(`${currentProps.value_rendered}`)
        .style('font-size', `${currentProps.value_label_font}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#282828');
      valueText.attr(
        'transform',
        `translate(${0 - valueText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillTop = valueText;
    } else if (currentProps.value_label_type === 'label') {
      const labelText = g
        .append('text')
        .attr('class', 'gaugeValueLabel')
        .text(`${currentProps.value_label}`)
        .style('font-size', `${currentProps.value_label_font * 0.55}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#707070')
        .attr('dy', '1em');
      labelText.attr(
        'transform',
        `translate(${0 - labelText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillTop = labelText;
    } else if (currentProps.value_label_type === 'both') {
      const valueText = g
        .append('text')
        .attr('class', 'gaugeValue')
        .text(`${currentProps.value_rendered}`)
        .style('font-size', `${currentProps.value_label_font}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#282828');
      valueText.attr(
        'transform',
        `translate(${0 - valueText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillTop = valueText;
      const labelText = g
        .append('text')
        .attr('class', 'gaugeValueLabel')
        .text(`${currentProps.value_label}`)
        .style('font-size', `${currentProps.value_label_font * 0.55}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#707070')
        .attr('dy', '1.2em');
      labelText.attr(
        'transform',
        `translate(${0 - labelText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillBottom = labelText;
    } else if (currentProps.value_label_type === 'dim') {
      const dimText = g
        .append('text')
        .attr('class', 'gaugeValueLabel')
        .text(`${currentProps.value_dimension}`)
        .style('font-size', `${currentProps.value_label_font * 0.55}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#707070')
        .attr('dy', '1em');
      dimText.attr(
        'transform',
        `translate(${0 - dimText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillTop = dimText;
    } else if (currentProps.value_label_type === 'dboth') {
      const valueText = g
        .append('text')
        .attr('class', 'gaugeValue')
        .text(`${currentProps.value_rendered}`)
        .style('font-size', `${currentProps.value_label_font}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#282828');
      valueText.attr(
        'transform',
        `translate(${0 - valueText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillTop = valueText;
      const dimText = g
        .append('text')
        .attr('class', 'gaugeValueLabel')
        .text(`${currentProps.value_dimension}`)
        .style('font-size', `${currentProps.value_label_font * 0.55}${limiting_aspect}`)
        .style('font-family', 'Arial, Helvetica, sans-serif')
        .style('fill', '#707070')
        .attr('dy', '1.2em');
      dimText.attr(
        'transform',
        `translate(${0 - dimText.node().getBBox().width / 2} ${
          0 + valueLabelCalc
        })`
      );
      drillBottom = dimText;
    }

    // Attach drill menu listeners
    if (drillTop) {
      drillTop.on('click', function (event) {
        LookerCharts.Utils.openDrillMenu({
          links: currentProps.value_links,
          event: event,
        });
      });
    }
    if (drillBottom) {
      drillBottom.on('click', function (event) {
        LookerCharts.Utils.openDrillMenu({
          links: currentProps.value_links,
          event: event,
        });
      });
    }

    // Scale the entire gauge group to fit the container
    const gBBox = g.node().getBBox();
    const wSca = (currentProps.w * 0.9) / gBBox.width; // 90% width
    const hSca = (currentProps.h * 0.9) / gBBox.height; // 90% height
    const scale = Math.min(wSca, hSca);

    // Adjust translation based on scaled size to keep it centered
    const scaledWidth = gBBox.width * scale;
    const scaledHeight = gBBox.height * scale;
    const translateX = (currentProps.w - scaledWidth) / 2 - gBBox.x * scale;
    const translateY = (currentProps.h - scaledHeight) / 2 - gBBox.y * scale;

    g.attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);

    // Update chart title position
    svg.select(".chart-title")
      .attr("x", currentProps.w / 2)
      .attr("y", 20) // Position title at the top
      .text(currentProps.chart_title);
  }
});
