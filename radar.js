<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Metric Radar Chart</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom styles for the body and container */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f0f4f8; /* Light background */
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            overflow: hidden; /* Prevent scrollbars */
        }

        /* Canvas styling */
        canvas {
            background-color: #ffffff; /* White background for the chart area */
            border-radius: 1rem; /* Rounded corners for the canvas */
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); /* Soft shadow */
            display: block;
            margin: 0 auto;
            /* Responsive sizing will be handled by JavaScript */
        }

        /* Container for the chart and controls */
        .chart-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem; /* Space between canvas and controls */
            padding: 2rem;
            background-color: #ffffff;
            border-radius: 1.5rem;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
            width: 100%; /* Ensure container takes full width for responsive sizing */
            max-width: 500px; /* Limit max width of the container */
        }

        /* Slider group styling */
        .slider-group {
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* Align labels to the left */
            width: 100%;
            max-width: 400px;
            margin-bottom: 0.75rem;
        }

        .slider-group label {
            font-size: 0.9rem;
            font-weight: 600;
            color: #475569; /* Gray text */
            margin-bottom: 0.25rem;
        }

        input[type="range"] {
            width: 100%;
            -webkit-appearance: none;
            height: 0.5rem;
            background: #e0e7ff; /* Light blue track */
            border-radius: 0.5rem;
            outline: none;
            transition: opacity .2s;
            cursor: pointer;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 1.5rem;
            height: 1.5rem;
            background: #4f46e5; /* Deep blue thumb */
            border-radius: 50%;
            cursor: grab;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            transition: background 0.3s ease;
        }

        input[type="range"]::-moz-range-thumb {
            width: 1.5rem;
            height: 1.5rem;
            background: #4f46e5;
            border-radius: 50%;
            cursor: grab;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            transition: background 0.3s ease;
        }

        input[type="range"]:active::-webkit-slider-thumb {
            background: #6366f1; /* Lighter blue on active */
            cursor: grabbing;
        }

        input[type="range"]:active::-moz-range-thumb {
            background: #6366f1;
            cursor: grabbing;
        }

        .value-display {
            font-size: 1.1rem;
            font-weight: bold;
            color: #334155; /* Darker text */
            margin-top: 0.5rem;
            width: 100%;
            text-align: center;
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
    <div class="chart-container">
        <canvas id="radarChart"></canvas> <!-- Removed fixed width/height -->
        <div id="controls" class="flex flex-col items-center w-full">
            <!-- Sliders will be generated here by JavaScript -->
        </div>
        <div id="currentValues" class="value-display"></div>
    </div>

    <script>
        console.log("Radar Chart script loaded."); // Debug log for script load

        // Get the canvas element and its 2D rendering context
        const canvas = document.getElementById('radarChart');
        const ctx = canvas.getContext('2d');

        // Get the controls and value display elements
        const controlsContainer = document.getElementById('controls');
        const currentValuesDisplay = document.getElementById('currentValues');

        // Chart parameters - these will be recalculated on resize
        let centerX, centerY, maxRadius;

        // Metric definitions (name, current value)
        const metrics = [
            { name: 'Speed', value: 70, min: 0, max: 100 },
            { name: 'Strength', value: 85, min: 0, max: 100 },
            { name: 'Agility', value: 60, min: 0, max: 100 },
            { name: 'Stamina', value: 90, min: 0, max: 100 },
            { name: 'Intelligence', value: 75, min: 0, max: 100 }
        ];

        // Number of metrics
        const numMetrics = metrics.length;
        // Angle between each metric axis
        const angleIncrement = (Math.PI * 2) / numMetrics;

        /**
         * Initializes or recalculates canvas dimensions and drawing parameters.
         */
        function setupCanvas() {
            // Set canvas dimensions based on its parent container's width, maintaining a square aspect ratio
            const container = canvas.parentElement;
            // Use clientWidth for the actual rendered width of the container
            const size = Math.min(container.clientWidth, 400); // Max 400px, but responsive to container

            canvas.width = size;
            canvas.height = size;

            centerX = canvas.width / 2;
            centerY = canvas.height / 2;
            maxRadius = Math.min(canvas.width, canvas.height) * 0.4; // Max radius of the radar chart
            console.log(`Canvas setup: width=${canvas.width}, height=${canvas.height}, maxRadius=${maxRadius}`);
        }

        /**
         * Generates the sliders for each metric dynamically.
         */
        function createSliders() {
            controlsContainer.innerHTML = ''; // Clear existing controls
            metrics.forEach((metric, index) => {
                const sliderGroup = document.createElement('div');
                sliderGroup.className = 'slider-group';

                const label = document.createElement('label');
                label.setAttribute('for', `slider-${index}`);
                label.textContent = metric.name;

                const slider = document.createElement('input');
                slider.type = 'range';
                slider.id = `slider-${index}`;
                slider.min = metric.min;
                slider.max = metric.max;
                slider.value = metric.value;

                slider.addEventListener('input', (event) => {
                    metrics[index].value = parseFloat(event.target.value);
                    updateChart();
                });

                sliderGroup.appendChild(label);
                sliderGroup.appendChild(slider);
                controlsContainer.appendChild(sliderGroup);
            });
        }

        /**
         * Draws the radial grid (concentric circles and radial lines) for the radar chart.
         */
        function drawGrid() {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redrawing

            // Draw concentric circles (value levels)
            ctx.strokeStyle = '#e2e8f0'; // Light gray for grid lines
            ctx.lineWidth = 1;
            const numLevels = 4; // Number of concentric circles (excluding the center)
            for (let i = 1; i <= numLevels; i++) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, maxRadius * (i / numLevels), 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw radial lines (metric axes)
            for (let i = 0; i < numMetrics; i++) {
                const angle = i * angleIncrement - Math.PI / 2; // Start from top (-90 degrees)
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + maxRadius * Math.cos(angle), centerY + maxRadius * Math.sin(angle));
                ctx.stroke();
            }
        }

        /**
         * Draws the labels for each metric axis.
         */
        function drawMetricLabels() {
            ctx.fillStyle = '#334155'; // Dark text color
            ctx.font = 'bold 0.9rem Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const labelOffset = 20; // Distance from the max radius

            metrics.forEach((metric, i) => {
                const angle = i * angleIncrement - Math.PI / 2; // Match axis angle
                const x = centerX + (maxRadius + labelOffset) * Math.cos(angle);
                const y = centerY + (maxRadius + labelOffset) * Math.sin(angle);

                // Adjust text alignment for better positioning around the circle
                if (angle > -Math.PI / 2 && angle < Math.PI / 2) { // Right side
                    ctx.textAlign = 'left';
                } else if (angle > Math.PI / 2 || angle < -Math.PI / 2) { // Left side
                    ctx.textAlign = 'right';
                } else { // Top/Bottom
                    ctx.textAlign = 'center';
                }

                ctx.fillText(metric.name, x, y);
            });
        }

        /**
         * Draws the radar plot polygon based on the current metric values.
         */
        function drawRadarPlot() {
            ctx.beginPath();
            let firstPoint = true;

            metrics.forEach((metric, i) => {
                const percentage = (metric.value - metric.min) / (metric.max - metric.min);
                const pointRadius = maxRadius * percentage;
                const angle = i * angleIncrement - Math.PI / 2; // Match axis angle

                const x = centerX + pointRadius * Math.cos(angle);
                const y = centerY + pointRadius * Math.sin(angle);

                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }

                // Draw a circle at each data point
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#4f46e5'; // Deep blue for the marker
                ctx.fill();
                ctx.strokeStyle = '#ffffff'; // White border for the marker
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            ctx.closePath();
            ctx.fillStyle = 'rgba(79, 70, 229, 0.3)'; // Semi-transparent blue fill
            ctx.fill();
            ctx.strokeStyle = '#4f46e5'; // Solid blue border
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        /**
         * Updates and redraws the entire radar chart.
         */
        function updateChart() {
            console.log("Updating chart..."); // Debug log
            setupCanvas(); // Recalculate dimensions on every update
            drawGrid();
            drawMetricLabels();
            drawRadarPlot();

            // Update the display of current values
            currentValuesDisplay.innerHTML = metrics.map(m =>
                `<strong>${m.name}:</strong> ${m.value.toFixed(0)}`
            ).join(' | ');
        }

        // Initial setup and draw
        createSliders();
        updateChart(); // Initial draw

        // Handle window resize to make the canvas responsive
        window.addEventListener('resize', () => {
            console.log("Window resized. Redrawing chart."); // Debug log
            updateChart(); // Recalculate dimensions and redraw
        });
    </script>
</body>
</html>
