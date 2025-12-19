#!/usr/bin/env bash
set -o errexit

# Install Python Dependencies
pip install -r requirements.txt

# Install Playwright Browser (Chromium)
# Install Playwright Browser (Chromium) and system dependencies
playwright install chromium
playwright install-deps chromium
