# ps API

A NestJS API for managing game servers, player accounts, payments, and VIP status.

## Features

- User account management
- VIP purchase system with MercadoPago integration
- Top player rewards system
- Admin panel with user search and management
- Dollar Blue rate tracking and price calculation

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd psAPI

# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env
```

## Database Setup

The application requires MySQL databases for each game server. Refer to the database configuration in `src/database/db.config.ts` for connection details.

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

The API documentation is available at `/api-docs` when running in development mode.

## Directory Structure

- `src/`: Source code
  - `main.ts`: Application entry point
  - `app.module.ts`: Root module
  - `database/`: Database configuration
  - `modules/`: Feature modules
    - `invoices/`: Payment and VIP management
    - `tops/`: Top player rewards
    - `admin-panel/`: Admin features
  - `common/`: Shared utilities and middleware

## Security

This application uses:
- Helmet for HTTP header security
- Rate limiting to prevent abuse
- JWT authentication for the admin panel

## Cron Jobs

- Daily update of Dollar exchange rate at 12:00
- Monthly distribution of player rewards on the 1st day of each month