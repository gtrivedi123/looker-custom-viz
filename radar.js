<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JavaScript Heatmap</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f0f2f5;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            padding: 20px;
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        canvas {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background-color: #ffffff;
            display: block; /* Remove extra space below canvas */
            max-width: 100%;
            height: auto;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8rem;
            text-align: center;
        }
        p {
            color: #666;
            margin-top: 10px;
            text-align: center;
            font-size: 0.9rem;
        }
    </style>
</head>
<body class="bg-gray-100 p-4">
    <div class="container">
        <h1 class="text-2xl font-bold">Simple Heatmap Visualization</h1>
        <p class="text-gray-600 mb-4">Generated with vanilla JavaScript (no external dependencies).</p>
        <canvas id="heatmapCanvas"></canvas>
        <p class="text-sm text-gray-500 mt-4">
            This heatmap displays random data with values from 0 to 100, mapped to a color gradient from blue (low) to red (high).
            Resize your browser window to see the canvas adjust.
        </p>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('heatmapCanvas');
            const ctx = canvas.getContext('2d');

            // --- Configuration ---
            const GRID_SIZE_X = 20; // Number of cells horizontally
            const GRID_SIZE_Y = 15; // Number of cells vertically
            const DATA_MIN = 0;
            const DATA_MAX = 100;

            // Define color stops for the gradient (RGB values)
            // Example: Blue (low) to Red (high)
            const COLOR_LOW = { r: 0, g: 0, b: 255 };    // Blue
            const COLOR_HIGH = { r: 255, g: 0, b: 0 };  // Red

            // --- Data Generation (Replace with your actual data) ---
            // This function generates random data for demonstration purposes.
            // In a Looker context, you would receive your data from the Looker API.
            function generateRandomData(rows, cols, minVal, maxVal) {
                const data = [];
                for (let y = 0; y < rows; y++) {
                    const row = [];
                    for (let x = 0; x < cols; x++) {
                        row.push(Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal);
                    }
                    data.push(row);
                }
                return data;
            }

            let heatmapData = generateRandomData(GRID_SIZE_Y, GRID_SIZE_X, DATA_MIN, DATA_MAX);

            // --- Color Interpolation Function ---
            // Interpolates between two colors based on a value (0 to 1)
            function interpolateColor(value, color1, color2) {
                const r = Math.round(color1.r + (color2.r - color1.r) * value);
                const g = Math.round(color1.g + (color2.g - color1.g) * value);
                const b = Math.round(color1.b + (color2.b - color1.b) * value);
                return `rgb(${r}, ${g}, ${b})`;
            }

            // --- Drawing Function ---
            function drawHeatmap() {
                // Adjust canvas size to fit its container
                // For Looker, you might set a fixed size or get it from the Looker container.
                const container = canvas.parentElement;
                canvas.width = container.clientWidth - 40; // Account for padding
                canvas.height = (canvas.width / GRID_SIZE_X) * GRID_SIZE_Y; // Maintain aspect ratio

                const cellWidth = canvas.width / GRID_SIZE_X;
                const cellHeight = canvas.height / GRID_SIZE_Y;

                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

                for (let y = 0; y < GRID_SIZE_Y; y++) {
                    for (let x = 0; x < GRID_SIZE_X; x++) {
                        const value = heatmapData[y][x];

                        // Normalize the value to a 0-1 range
                        const normalizedValue = (value - DATA_MIN) / (DATA_MAX - DATA_MIN);

                        // Get the color for the current cell
                        const color = interpolateColor(normalizedValue, COLOR_LOW, COLOR_HIGH);

                        ctx.fillStyle = color;
                        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

                        // Optional: Draw cell value (for debugging/detail)
                        // ctx.fillStyle = 'black';
                        // ctx.font = '10px Arial';
                        // ctx.textAlign = 'center';
                        // ctx.textBaseline = 'middle';
                        // ctx.fillText(value, x * cellWidth + cellWidth / 2, y * cellHeight + cellHeight / 2);
                    }
                }
            }

            // --- Event Listeners for Responsiveness ---
            // Redraw heatmap when the window is resized
            window.addEventListener('resize', drawHeatmap);

            // Initial draw
            drawHeatmap();
        });
    </script>
</body>
</html>
