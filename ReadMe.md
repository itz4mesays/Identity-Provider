# Identity Provider

## Overview

The **Identity Provider** is a backend application built with **Node.js** and **TypeScript**.
The Identity Provider is a system or service responsible for authenticating users and generating SAML assertions. It vouches for the user’s identity to service providers (SPs) by issuing SAML tokens.
---

## Table of Contents

- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [What It Does](#what-it-does)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Running Production](#running-production)

---

## What It Does:

✅ Acts as the authentication authority.
✅ Stores user credentials and verifies identities..
✅ Generates SAML assertions (containing user identity data) for the SP.

## How it works

✅ /saml/idp: Exposes IdP metadata (certificates, SSO/SLO URLs, etc.)
✅ /saml/idp/login: Receives AuthnRequest from the SP and process SAML Request
✅ /idp/login/submit: Authenticates the user, then sends a SAML Response (with Assertion) to the SP’s

---

## Prerequisites

Before running the application, ensure you have the following installed:

✅ **Node.js** (version 16 or higher)
✅ **npm** or **yarn**

---

## Installation

### 1. Clone the Repository

```bash
git clone from repository
cd into the project folder
```

```bash
run npm install
```

---

## Running locally

Starting the application locally, run 

```bash
npm run dev
```

## Running production

Starting the application production, run 

```bash
npm run prod
```