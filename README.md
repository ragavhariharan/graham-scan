# Graham Scan — Interactive Convex Hull Visualizer

An educational, step-by-step visualization of the Graham Scan algorithm for computing the convex hull of a set of points.



## What is this?

The **convex hull** is the smallest convex polygon that contains all points. The Graham Scan algorithm finds it efficiently by:
1. Finding the bottommost point (pivot)
2. Sorting remaining points by polar angle
3. Scanning with a stack, removing points that cause concavities

This interactive visualizer lets you add points, step through each operation, and see the algorithm's logic in real time.

## Features

- **Click to add points** on the canvas
- **Drag points** to reposition them
- **Random** button generates a set of random points
- **Step-by-step playback** — start, pause, step forward/backward
- **Speed control** — adjust animation speed
- **Three-panel layout:**
  - **Canvas** — the main visualization
  - **Explanation** — step description and live state
  - **Pseudocode** — algorithm code with active line highlighting
- **Orientation check display** — shows cross product value and turn direction
- **Stack visualization** — see the algorithm's internal stack grow and shrink
- **Light / Dark theme** toggle

## Quick Start

Open `index.html` in a browser — no build step required.

## Algorithm Complexity

| Operation | Time |
|-----------|------|
| Find pivot | O(n) |
| Sort by angle | O(n log n) |
| Stack scan | O(n) |
| **Total** | **O(n log n)** |

## Files

- `graham.js` — Algorithm core, step generation, cross/orientation logic
- `renderer.js` — Canvas rendering, point/line drawing, animation
- `app.js` — Event handling, playback controls, state management
- `index.html` — App structure and UI
- `style.css` — All styling including dark mode

## How It Works

The visualization generates a sequence of **steps** — each step describes the full state (point states, hull edges, current point, stack contents) for one algorithmic decision. The renderer plays these steps back with smooth transitions.

Key functions in `graham.js`:
- `crossProduct(O, A, B)` — orientation test via 2D cross product
- `polarAngle(pivot, point)` — angle for sorting points CCW
- `generateGrahamScanSteps(points)` — produces the step sequence

## License

MIT
