# Chefs Embed - Node.js Express with Keycloak Authentication

A skeleton Node.js Express application with Keycloak OAuth/OIDC authentication, featuring public and protected pages.

## Features

- **Public Page** (`/`) - Accessible to everyone
- **Protected Page** (`/protected`) - Requires Keycloak authentication
- **CHEFS Embed Page** (`/chefs-embed`) - Platform-owned embed with Keycloak authentication
- **Plugin Directory** (`/chefs-embed-plugins`) - Browse and launch plugins
- **Plugin-driven Embed** (`/chefs-embed-plugin`) - Loads selected plugin module, shapes context, and wires events
- **Theme CSS demo plugin** - Shows how clients can bundle and load their own theme stylesheet via `theme-css`
- **Keycloak Integration** - OAuth/OIDC authentication flow
- **Session Management** - Express sessions with Passport.js
- **Pre-configured Realm** - Keycloak realm with test user and client

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (installed in devcontainer)

## Setup Instructions

### 1. Start Keycloak

The Keycloak instance is configured to automatically import the realm configuration on startup:

```bash
cd .devcontainer
docker-compose up -d
```

Wait for Keycloak to start (usually takes 30-60 seconds). You can check the logs:

```bash
docker-compose logs -f keycloak
```

Once started, Keycloak will be available at `http://localhost:7777`

- **Admin Console**: `http://localhost:7777`
- **Admin Username**: `admin`
- **Admin Password**: `admin`

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Create a `.env` file in the root directory if you need to override defaults:

```env
PORT=3333
SESSION_SECRET=your-secret-key-change-in-production
KEYCLOAK_ISSUER=http://localhost:7777/realms/chefs-embed
KEYCLOAK_CLIENT_ID=express-app
KEYCLOAK_CALLBACK_URL=http://localhost:3333/auth/callback
CHEFS_BASE_URL=https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802
CHEFS_FORM_ID=3145c95c-337e-41e5-836c-138cf1256bc9
CHEFS_API_KEY=a7464f97-9377-42ee-9f73-7c2d4250c132
```

### 4. Start the Express Application

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The application will be available at `http://localhost:3333`

## Keycloak Configuration

### Realm: `chefs-embed`

The realm is automatically imported when Keycloak starts. It includes:

- **Test User**:
  - Username: `testuser`
  - Password: `testpass`
  - Email: `testuser@example.com`

- **Client**: `express-app`
  - Type: Public Client
  - Redirect URIs: `http://localhost:3333/auth/callback`, `http://localhost:3333/*`
  - Web Origins: `http://localhost:3333`

## CHEFS Embed Configuration

This application demonstrates embedding CHEFS forms using the `chefs-form-viewer` web component with Keycloak authentication, plus a plugin system that can shape token/user/headers and inject a customer-owned theme stylesheet.

### Default Configuration

- **Base URL**: `https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802` (override with `CHEFS_BASE_URL`)
- **Form ID**: `3145c95c-337e-41e5-836c-138cf1256bc9` (override with `CHEFS_FORM_ID`)
- **API Key**: `a7464f97-9377-42ee-9f73-7c2d4250c132` (override with `CHEFS_API_KEY`)
- These are platform defaults for the `/chefs-embed` route; plugin-driven embeds supply their own baseUrl/formId/apiKey from each plugin manifest.

### How It Works

1. **Authentication Token Fetching**: The backend fetches a CHEFS authentication token from the gateway endpoint using Basic authentication (`base64(formId:apiKey)`)

2. **Web Component Attributes**:
   - `form-id`: CHEFS form UUID (defaults above)
   - `auth-token`: JWT token fetched from CHEFS gateway endpoint
   - `base-url`: Base URL for CHEFS API (defaults above)
   - `token`: JSON string of the Keycloak access token payload for Form.io evalContext
   - `user`: JSON string of a user object for evalContext
   - `headers`: JSON string of headers for evalContext (filtered to avoid forbidden browser headers)
   - `theme-css`: URL to a customer-owned theme stylesheet (set by plugins)

3. **Token Context**: The complete Keycloak access token payload is passed to the web component via the `token` attribute, providing user context (roles, permissions, identity) to the Form.io evalContext. Plugins can further shape token/user/headers.

### Implementation Details

**Platform embed** (`/chefs-embed`):

- Requires Keycloak authentication
- Fetches CHEFS auth token from gateway endpoint
- Decodes the user's Keycloak access token
- Passes token/user/headers to `chefs-form-viewer`

**Plugin-driven embed** (`/chefs-embed-plugin?plugin=<slug>`):

- Lists available plugin manifests from `/public/plugins`
- Loads the selected plugin module, letting it shape token/user/headers
- Plugins can set `theme-css` so the component loads customer-owned CSS (see `theme-css-demo`)

The web component loads the CHEFS form and uses the provided tokens for authentication and user context. Plugin event handlers can cancel or await lifecycle events.

## Application Routes

- `GET /` - Public page (accessible to everyone)
- `GET /protected` - Protected page (requires authentication)
- `GET /chefs-embed` - Platform CHEFS embed (requires authentication)
- `GET /chefs-embed-plugins` - Plugin directory (requires authentication)
- `GET /chefs-embed-plugin?plugin=<slug>` - Plugin-driven embed (requires authentication)
- `GET /auth/login` - Initiate Keycloak login
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - Logout and redirect to Keycloak logout

## Testing the Application

1. **Access Public Page**: Navigate to `http://localhost:3333`
   - You should see the public page without logging in
   - Click "Login with Keycloak" to authenticate

2. **Login Flow**:
   - Click "Login" on the public page
   - You'll be redirected to Keycloak login page
   - Login with credentials:
     - Username: `testuser`
     - Password: `testpass`
   - After successful login, you'll be redirected to the protected page

3. **Access Protected Page**: Navigate to `http://localhost:3333/protected`
   - If not logged in, you'll be redirected to login
   - If logged in, you'll see your user information

4. **Access CHEFS Embed Page**: Navigate to `http://localhost:3333/chefs-embed`
   - If not logged in, you'll be redirected to login
   - If logged in, you'll see the embedded CHEFS form
   - The form uses the authenticated user's token for context

5. **Try the Plugin Flow**:
   - Navigate to `http://localhost:3333/chefs-embed-plugins`
   - Launch **Theme CSS Demo** to see a customer-bundled theme loaded via `theme-css`
   - Watch console logs for lifecycle events and theme load confirmation

6. **Logout**: Click "Logout" to end your session

## Project Structure

```
chefs-embed/
├── .devcontainer/
│   ├── docker-compose.yml      # Keycloak service configuration
│   ├── chefs-embed-realm.json  # Keycloak realm import file
│   └── devcontainer.json       # VS Code devcontainer config
├── views/
│   ├── public.ejs                  # Public page template
│   ├── protected.ejs               # Protected page template
│   ├── chefs-embed.ejs             # Platform embed template
│   ├── chefs-embed-plugins.ejs     # Plugin directory
│   └── chefs-embed-plugin.ejs      # Plugin-driven embed
├── utils/
│   ├── chefs.js                    # CHEFS API token fetching utility
│   └── jwt.js                      # JWT decoding utility
├── public/
│   ├── styles.css                  # Application styles
│   └── plugins/
│       ├── package.json            # ESM for plugins
│       ├── chefs-embed-demo.js     # Demo: headers/token shaping and events
│       ├── second-chefs-embed.js   # Demo: user shaping
│       ├── theme-css-demo.js       # Demo: customer theme CSS loader
│       └── theme-css-demo.css      # Customer-owned theme stylesheet
├── config.js                        # Application configuration
├── index.js                         # Express application entry point
├── package.json                     # Node.js dependencies
└── README.md                        # This file
```

## Troubleshooting

### Keycloak not starting

- Check if port 7777 is already in use
- Review Keycloak logs: `docker-compose logs keycloak`
- Ensure the realm file is mounted correctly

### Authentication not working

- Verify Keycloak is running: `http://localhost:7777`
- Check that the realm `chefs-embed` exists in Keycloak admin console
- Verify redirect URIs match in Keycloak client configuration
- Check browser console for errors

### Session issues

- Clear browser cookies
- Verify `SESSION_SECRET` is set (or using default)
- Check that cookies are enabled in your browser

## Development

The application uses:

- **Express.js** - Web framework
- **Passport.js** - Authentication middleware
- **passport-openidconnect** - Keycloak OIDC strategy
- **express-session** - Session management
- **EJS** - Template engine
- **CHEFS Form Viewer** - Web component for embedding CHEFS forms

### CHEFS Integration

The CHEFS embed functionality demonstrates:

- Fetching authentication tokens from CHEFS gateway API
- Using Basic authentication with `base64(formId:apiKey)`
- Passing Keycloak access token payload to Form.io evalContext
- Event handling for form lifecycle events (load, submit, error, etc.)

## License

ISC
