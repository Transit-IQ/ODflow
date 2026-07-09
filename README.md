# TransitIQ Dashboard

The TransitIQ Dashboard visualizes public transportation data to identify demand gaps and highlight transit performance. 
Currently, it demonstrates a pilot project for the HaTikva neighborhood in South-East Tel Aviv.

## Project Structure

- `public/`: Contains the frontend assets:
  - `css/`: Styling for the application.
  - `js/`: Application logic (`app.js`), routing data (`routes.js`), and geospatial data (`data.js`).
- `scripts/`: Data fetching and generation scripts.
- `index.html`: The main entry point of the dashboard.
- `vite.config.js`: Configuration for the Vite bundler.

## Development

The project uses [Vite](https://vitejs.dev/) as its development server and build tool. It relies on [Leaflet](https://leafletjs.com/) for rendering interactive maps.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Setup and Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the provided local URL in your browser to view the dashboard.

### Building for Production
To build the optimized static assets:
```bash
npm run build
```
The output will be generated in the `dist/` directory.

## Deployment
The project is configured to easily deploy to GitHub Pages using the `gh-pages` package. 

To deploy the current code, simply run:
```bash
npm run deploy
```
This command will automatically build the project and push the `dist/` folder to the `gh-pages` branch on GitHub.

## Features
- **Speed Heatmaps**: Visualizes bus speeds across road segments in the neighborhood at different times of the day.
- **Congestion Analysis**: Highlights bottlenecks where average bus speeds drop below 15 km/h.
- **Station Analytics**: Provides interactive insights into daily boardings, line frequencies, and passenger demographics for bus stops.
- **Dynamic Bus Lines**: Allows selecting multiple bus routes simultaneously to view their paths and stops.
- **Dark & Light Mode**: Adapts dynamically based on user preference.
