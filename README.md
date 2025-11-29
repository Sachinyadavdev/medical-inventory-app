# Medical Inventory Management System

A comprehensive desktop application for managing medical inventory, tracking stock, and monitoring expiry dates. Built with Electron, React, and SQLite.

## Features

- **Inventory Management**: Add, update, and delete medical items with batch numbers and expiry dates.
- **Dashboard**: Real-time statistics for Total Items, Expired Items, and Items Expiring Soon (next 3 months).
- **Smart Filtering**: Quickly filter inventory to see expired or near-expiry stock.
- **Search**: Instant search by Item Name or Batch Number.
- **Data Import/Export**:
  - Import inventory from Excel files (supports `.xlsx` and `.xls`).
  - Export data to CSV and PDF formats.
  - Download sample Excel template for bulk imports.
- **Backup & Restore**: Securely backup your entire database and restore it when needed.
- **Security**:
  - Login authentication system.
  - Auto-logout after 1 hour of inactivity.
  - Password-protected critical actions (Reset Data, Restore Database).
- **Modern UI**: Clean, glassmorphism-inspired interface with dark mode elements.

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Sachinyadavdev/CMS-NextJs-Project.git
    cd medical-inventory-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the application (Development)**:
    ```bash
    npm run dev
    ```

4.  **Build for Production (Windows)**:
    ```bash
    npm run build:win
    ```
    The installer will be generated in the `dist` folder.

## Usage

### Login Credentials
- **Username**: `admin`
- **Password**: `Sachin@123`

### Critical Actions Password
For sensitive actions like **Reset Data** or **Restore Database**, use the admin password:
- **Password**: `Sachin@123`

### Import Data
1.  Click "Download Sample" to get the correct Excel format.
2.  Fill in your data (Dates should be in `DD/MM/YYYY` or `YYYY-MM-DD` format).
3.  Click "Import Excel" to load your inventory.

## Technologies Used

- **Electron**: Cross-platform desktop application framework.
- **React (Vite)**: Fast and modern frontend library.
- **Better-SQLite3**: High-performance local database.
- **Electron Builder**: For packaging and distribution.
- **XLSX**: For Excel file handling.
- **jsPDF**: For PDF generation.

## Developer

Developed by **[Digital Meedia](https://digitalmeedia.com/)**.

---
&copy; 2025 Medical Inventory App. All rights reserved.
