#!/usr/bin/env bash
set -o errexit

# Install Python Dependencies
pip install -r requirements.txt

# Install Playwright Browser (Chromium)
playwright install chromium
