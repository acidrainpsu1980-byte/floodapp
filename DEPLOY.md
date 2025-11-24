# Deploying Flood Relief App to Azure

This guide explains how to deploy your Next.js application to **Azure Web Apps (Linux)**.

## Prerequisites
1.  **Azure Account**: You have an Azure for Education account.
2.  **GitHub Account**: To host your code.
3.  **Azure CLI** (Optional): If you want to deploy from the command line.

---

## Method 1: GitHub Actions (Recommended)

This method automatically deploys your app whenever you push changes to GitHub.

### Step 1: Create the App Service in Azure
1.  Log in to the [Azure Portal](https://portal.azure.com).
2.  Search for **"App Services"** and click **Create** -> **Web App**.
3.  **Basics Tab**:
    *   **Subscription**: Select your "Azure for Students" subscription.
    *   **Resource Group**: Create a new one (e.g., `flood-relief-rg`).
    *   **Name**: Choose a unique name (e.g., `flood-relief-hatyai`).
    *   **Publish**: Code.
    *   **Runtime stack**: `Node 20 LTS`.
    *   **Operating System**: `Linux`.
    *   **Region**: **East US** (Recommended for Student Accounts).
        > **Note**: If you see a "RequestDisallowedByAzure" error, it means your student subscription is restricted to specific regions. Try **East US**, **Central US**, or **West Europe**.
    *   **Pricing Plan**: Select `Free F1` (if available) or `Basic B1`.
4.  Click **Review + create** -> **Create**.

### Step 2: Get Publish Profile
1.  Go to your new App Service resource.
2.  Click **"Get publish profile"** in the top toolbar. This downloads a file.
3.  Open the file with a text editor and copy the entire content.

### Step 3: Configure GitHub Secrets
1.  Go to your GitHub repository.
2.  Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
3.  Click **New repository secret**.
4.  **Name**: `AZUREAPPSERVICE_PUBLISHPROFILE`
5.  **Value**: Paste the content of the publish profile.
6.  Click **Add secret**.

### Step 4: Update Workflow File
1.  Open `.github/workflows/azure-deploy.yml` in your project.
2.  Find `app-name: 'YOUR_APP_NAME_HERE'` and replace it with your actual App Service name (e.g., `flood-relief-hatyai`).
3.  Commit and push your code to GitHub.

**Result**: GitHub Actions will build and deploy your app automatically!

---

## Method 2: Azure CLI (Manual)

If you don't want to use GitHub, you can deploy directly from your computer.

1.  **Login**:
    ```bash
    az login
    ```

2.  **Create Resource Group** (if not exists):
    ```bash
    az group create --name flood-relief-rg --location southeastasia
    ```

3.  **Create App Service Plan**:
    ```bash
    az appservice plan create --name flood-relief-plan --resource-group flood-relief-rg --sku B1 --is-linux
    ```

4.  **Create Web App**:
    ```bash
    az webapp create --resource-group flood-relief-rg --plan flood-relief-plan --name flood-relief-hatyai --runtime "NODE:20-lts"
    ```

5.  **Build the App**:
    ```bash
    npm run build
    ```

6.  **Deploy**:
    ```bash
    # Zip the standalone build
    cd .next/standalone
    cp -r ../static ./.next/static
    cp -r ../../public ./public
    zip -r ../../site.zip .
    cd ../..

    # Upload
    az webapp deployment source config-zip --resource-group flood-relief-rg --name flood-relief-hatyai --src site.zip
    ```

---

## Important Configuration

### Startup Command
Azure needs to know how to start your app.
1.  Go to your App Service in Azure Portal.
2.  Go to **Settings** -> **Configuration** -> **General settings**.
3.  **Startup Command**: `node server.js`
4.  Click **Save**.

### Environment Variables
If you have any secrets (like API keys), add them in **Settings** -> **Environment variables**.
