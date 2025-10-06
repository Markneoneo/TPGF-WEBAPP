# 🧩 TPGF WebApp (Rails)

## Overview

TPGF WebApp is a Ruby on Rails–based internal web application that allows users to input various configuration and test parameters through a browser interface and generate a JSON configuration file based on those inputs.

- The system provides a structured UI for defining multiple parameter sets (such as charz_parameters, core_mapping, ip_configuration, and production_parameters) and outputs a downloadable JSON file containing the combined results.
- It is primarily used for parameter management, data preparation, and automated JSON generation within the TPGF workflow.

## 🚀 Key Features

- **Interactive Form Interface:**
Users can input structured test or configuration data via multiple grouped input forms.

- **Dynamic JSON Generation:**
The backend converts user inputs into a JSON document according to predefined structures.

- **File Download Functionality:**
Once generated, users can directly download the resulting `.json` file from the interface.

- **Modern Rails 8 Stack:**
Built using the latest Rails 8.0.2 framework with Ruby 3.4.5, incorporating Hotwire (Turbo + Stimulus) for seamless UI interactivity.

- **Deployment Ready:**
Fully containerized via Docker and deployable with Kamal and Thruster for production use.

## 🏗️ Application Architecture

```
app/
├── controllers/
│ ├── application_controller.rb # Base controller
│ └── test_settings_controller.rb # Main logic for input & JSON generation
│
├── models/
│ └── application_record.rb # Base ActiveRecord model (minimal use)
│
├── views/
│ ├── layouts/application.html.erb # Main layout, includes Turbo + Stimulus
│ └── test_settings/
│ ├── new.html.erb # Main input form page
│ ├── _charz_parameters.html.erb # Partial for characteristic parameters
│ ├── _core_mapping.html.erb # Partial for core-to-logic mapping
│ ├── _ip_configuration_form.html.erb # Partial for IP configuration section
│ └── _production_parameters.html.erb # Partial for production setup
│
config/
├── routes.rb # Defines routes for input and generation
├── deploy.yml # Kamal deployment configuration
├── puma.rb, boot.rb, environment.rb # Standard Rails configuration
└── application.rb # Application initialization
```

### Key Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Redirects to `test_settings#new` |
| `/test_settings/new` | GET | Display form for user input |
| `/test_settings/generate` | POST | Process input and generate JSON |
| `/test_settings/download` | GET | Download the generated JSON file |

## ⚙️ Tech Stack

| Category | Technology |
|----------|------------|
| Language | Ruby 3.4.5 |
| Framework | Ruby on Rails 8.0.2 |
| Frontend | Hotwire (Turbo + Stimulus), ERB templates |
| JSON | Jbuilder |
| Web Server | Puma |
| Containerization | Docker |
| Deployment | Kamal + Thruster |
| Styling / JS Bundling | cssbundling-rails, jsbundling-rails |
| Asset Pipeline | Propshaft |
| Optional DB | PostgreSQL / SQLite (currently unused) |

## 🚀 Quick Start / Launching the Webapp

There are three ways to launch the TPGF Webapp locally, depending on your OS and preference:

### Prerequisites
- **Ruby** 3.4.5 (check with `ruby -v`)
- **Node.js** 24+ (check with `node -v`)
- **Bundler** (install with `gem install bundler`)
- **Yarn** (install with `npm install -g yarn`)

---

### Option 1: **Foreman** (Fastest, Cross-Platform) ⚡

```bash
foreman start -f Procfile.dev -p 3000
```

- Starts Rails server, JS bundler, and CSS watcher in one terminal
- Navigate to http://localhost:3000 manually
- **Best for:** Experienced developers who want a single terminal process

---

### Option 2: **One-Click Bash Launcher** (macOS/Linux) 🐧

```bash
./dev_start.sh
```

- Automatically checks for Ruby, Bundler, Node, and Yarn
- Installs missing gems and JS dependencies
- Starts Rails, JS, and CSS watchers
- **Opens browser automatically** at http://localhost:3000
- **Best for:** macOS/Linux users who want zero-config setup

---

### Option 3: **One-Click Windows Launcher** 🪟

Just **double-click** `start_webapp.bat` in the project root.

- Checks for Ruby, Node, Bundler, and Yarn (warns if missing)
- Installs gems and JS dependencies automatically
- Starts Rails server, JS watcher, and CSS watcher in separate windows
- **Opens browser automatically** at http://localhost:3000
- Press any key in the launcher window to stop all servers
- **Best for:** Windows users who want a GUI-like experience

---

### 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| "Ruby not found" | Install Ruby 3.4.5 from [rubyinstaller.org](https://rubyinstaller.org/) |
| "Node not found" | Install Node.js 24+ from [nodejs.org](https://nodejs.org/) |
| "Yarn not found" | Run `npm install -g yarn` |
| Port 3000 in use | Change `PORT=3000` to another port in the launcher scripts |
| Assets not loading | Run `bin/rails assets:precompile` |

---

### 🎯 First-Time Setup Summary

1. Clone the repository
2. Choose your launcher:
- **Windows:** Double-click `start_webapp.bat`
- **macOS/Linux:** Run `./dev_start.sh`
- **Any OS with Foreman:** Run `foreman start -f Procfile.dev -p 3000`
3. The webapp opens automatically at http://localhost:3000
4. Start creating your JSON configurations!

## 🧰 Manual Local Development Setup

If you prefer manual setup over the one-click launchers:

### 1. Prerequisites

Ensure you have:
- Ruby 3.4.5
- Node.js 24+
- Yarn
- Bundler
- Git

### 2. Clone and Setup

```bash
git clone <repo_url>
cd tpgf_webapp_rails/tpgf_webapp_rails

# Install Ruby dependencies
bundle install

# Install Node/Yarn dependencies
yarn install

# Set up environment keys
cp config/master.key.example config/master.key
```

### 3. Run Manually

```bash
bin/rails server
```

Then open http://localhost:3000

## 🐳 Docker Setup

### Build

```bash
docker build -t tpgf_webapp_rails .
```

### Run

```bash
docker run -d -p 80:80 \
-e RAILS_MASTER_KEY=$(cat config/master.key) \
--name tpgf_webapp_rails tpgf_webapp_rails
```

### Access

Navigate to http://localhost

The app will start on port 80 and serve via Thruster → Puma.

## ☁️ Deployment (Kamal)

Kamal simplifies deployment to remote servers or clusters.
Configuration is defined in `config/deploy.yml`.

### Basic Steps:

```bash
# Authenticate to registry
export KAMAL_REGISTRY_PASSWORD=<token>

# Deploy the web service
bin/kamal deploy
```

### Deployment Details:

- **service:** tpgf_webapp_rails
- **Image:** your-user/tpgf_webapp_rails
- **Proxy:** SSL via Let's Encrypt (configured)
- **Example host:** app.example.com
- **Environment secrets managed via** `.kamal/secrets`

### Aliases

You can use these shortcuts:

```bash
bin/kamal console # Open Rails console
bin/kamal logs # Tail server logs
bin/kamal shell # Access container shell
```

## 🧠 Core Logic: Input → JSON

The `test_settings_controller.rb` handles the main logic flow:

- **new:** renders the input form
- **generate:** processes form parameters, builds a Ruby hash
- **download:** serves the generated JSON file to the user

Views in `/app/views/test_settings/` are composed of modular partials, each representing a form section.
These sections correspond to structured JSON objects that get combined during generation.

The resulting JSON file is stored temporarily and sent as a downloadable response.

## 🧾 Environment Variables

| Variable | Description |
|----------|-------------|
| `RAILS_MASTER_KEY` | Required to decrypt Rails credentials |
| `RAILS_ENV` | Set to `production` in Docker |
| `SOLID_QUEUE_IN_PUMA` | Enables integrated job processing (default: true) |
| `WEB_CONCURRENCY` | Number of web workers |
| `JOB_CONCURRENCY` | Number of background job threads |

## 🧩 Folder Structure (Simplified)

```
tpgf_webapp_rails/
├── app/ → Main app logic (controllers, views)
├── bin/ → Helper scripts (rails, rake, kamal)
├── config/ → App + deployment configuration
├── db/ → Schemas & seeds (if applicable)
├── public/ → Static assets & error pages
├── storage/ → Temporary files (ActiveStorage)
├── test/ → System & unit tests
└── Dockerfile → Container build instructions
```

## 🧪 Testing

Basic tests are included under `/test/`:

```bash
bin/rails test
```

You can extend this with:
- RSpec (optional)
- Capybara + Selenium for browser testing

## 🧯 Troubleshooting

| Problem | Solution |
|---------|----------|
| JSON not generating | Check controller params; ensure form field names match expected structure |
| Docker build fails | Verify `config/master.key` and `Gemfile.lock` exist |
| Kamal deployment fails | Ensure SSH access and registry credentials are configured |
| Asset 404 errors | Run `bin/rails assets:precompile` before deploy |
| Invalid master key | Ensure `.kamal/secrets` contains correct `RAILS_MASTER_KEY` |

## 🧱 Future Improvements

- Add database persistence (store past configurations)
- Add validation for input forms
- Enable multiple JSON templates
- Implement user authentication (optional)
- Improve JSON preview before download

## 👨‍💻 Maintainers

**Internal development team — TPGF Systems**

For access or deployment credentials, refer to the internal Confluence documentation or contact the DevOps admin.

---

## 📋 Appendix: Cleaning Up Unused Rails Files

Since this app was generated from the default Rails template, several directories are unused and can be removed to reduce clutter:

### Safe to Remove:
- `.github/` - GitHub Actions (redundant in larger repo)
- `app/jobs/` - No background jobs used
- `app/mailers/` - No email functionality
- `app/channels/` - No WebSocket/ActionCable usage
- `lib/tasks/` - No custom rake tasks (if empty)

### Optional to Remove:
- `app/helpers/` - Keep only if adding view helpers
- `test/` - Keep only if writing tests
- `config/locales/en.yml` - Keep only if using translations
- `storage/` - Keep only if using ActiveStorage

To clean up, run:
```bash
rm -rf .github app/jobs app/mailers app/channels
```