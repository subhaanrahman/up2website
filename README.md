# Up2

## Project info

This repo originated in Lovable and may still sync through GitHub, but the active production frontend is no longer deployed via Lovable Publish.

Current production hosting is a containerized build from [`Dockerfile`](Dockerfile), deployed by the team via Google Cloud Run.

## How can I edit this code?

There are several ways of editing your application.

**MOST IMPORTANTLY FOLLOW THE BELOW SETUP**

**Branches**
- main
- develop

**Environments**
- development
- production

**Use Lovable (optional / legacy workflow)**

If you still use Lovable for GitHub sync or prompt-driven changes, open the current project from your Lovable workspace.

Lovable can still sync with this repo, but it is not the primary production deployment path.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Production deploys use the repo container build from [`Dockerfile`](Dockerfile) and the team’s Google Cloud Run workflow.

## Can I connect a custom domain?

Yes. Treat the active production domain as part of the Cloud Run deployment inventory and disaster recovery plan rather than the older Lovable Publish flow.
