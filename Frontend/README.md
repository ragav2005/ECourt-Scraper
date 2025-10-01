# eCourts Scraper Frontend# Welcome to React Router!

A modern React frontend built with React Router v7 and Tailwind CSS for the eCourts scraper application.A modern, production-ready template for building full-stack React applications using React Router.

## Features

- **Modern Stack**: React 19 + React Router v7 + Tailwind CSS## Features
- **Multi-step Wizard**: Intuitive form wizard for case searching
- **Real-time Statistics**: Dashboard with comprehensive analytics- Server-side rendering
- **Responsive Design**
- **TypeScript**: Full type safety and better developer experience- Asset bundling and optimization
- Data loading and mutations

## Project Structure- TypeScript by default

- TailwindCSS for styling

````-

Frontend/

├── app/## Getting Started

│   ├── routes/

│   │   ├── home.tsx           # Dashboard/Landing page### Installation

│   │   ├── scraper.tsx        # Multi-step scraper wizard

│   │   ├── logs.tsx           # Query logs and statisticsInstall the dependencies:

│   │   └── dashboard.tsx      # Alternative dashboard view

│   ├── root.tsx               # Root layout component```bash

│   ├── routes.ts              # Route configurationnpm install

│   └── app.css                # Global styles```

├── public/

│   └── ...                    # Static assets### Development

├── package.json               # Dependencies and scripts

└── vite.config.ts             # Vite configurationStart the development server with HMR:

````

```bash

npm run dev

```

1. Install dependencies:

`Your application will be available at  http://localhost:5173`.

3. Build for production:

````bash##

npm run build

```### Docker Deployment



## Backend IntegrationTo build and run using Docker:



This frontend connects to the FastAPI backend running on `http://localhost:8000`.```bash

docker build -t my-app .

Make sure the backend is running before starting the frontend.

# Run the container

## Technology Stackdocker run -p 3000:3000 my-app

````

- **React 19** - Latest React with improved performance
- **React Router v7** - File-based routing with type safetyThe containerized application can be deployed to any platform that supports Docker, including:
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server- Google Cloud Run

## 4. Dashboard (`/dashboard`)├── package.json

Alternative dashboard layout├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│ ├── client/ # Static assets
│ └── server/ # Server-side code

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.
