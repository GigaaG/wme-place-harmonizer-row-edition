
# 🗺️ WME Place Harmonizer ROW Edition

**TypeScript userscript for Waze Map Editor ROW Edition place harmonization**

An intelligent assistant that automatically checks place information against community-defined standards and suggests improvements – completely under your control.

---

## 📋 Table of Contents

- [What does this script do?](#what-does-this-script-do)
- [Installation](#installation)
- [How to use](#how-to-use)
- [Validations & checks](#validations--checks)
- [Settings](#settings)
- [Whitelist: Managing exclusions](#whitelist-managing-exclusions)
- [Report errors & problems](#report-errors--problems)
- [FAQ](#faq)

---

## 🎯 What does this script do?

WME Place Harmonizer is a **Tampermonkey script** that helps you maintain place information. It:

### 🔍 Analyzes places automatically
When you select a place in WME, the script checks it against:
- **Community standards** – Guidelines your Waze community defines
- **Global Waze guidelines** – International best practices
- **Google Maps data** – External validation (configurable per community)

### 💡 Suggests improvements
For each issue found, it shows:
- What's wrong
- What the recommended value should be
- Why it matters

### ✅ Keeps you in control
- The script **never makes changes** to WME automatically
- You decide which suggestions to accept
- You apply everything manually in WME
- You can whitelist specific issues to ignore them

### 🌍 Community-powered
Each community manages their own configuration:
- Define validation rules
- Enable/disable specific checks (including Google Maps validation)
- Set category standards
- Editors automatically get the local community's guidelines

### 🌐 Multilingual
Supports English, Dutch, French (additional languages can be added)

---

## 💻 Installation

### ✅ Requirements

- **Tampermonkey** extension: [Chrome](https://www.tampermonkey.net/) | [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) | [Safari](https://apps.apple.com/us/app/tampermonkey/id1482490089)

### 📥 Installation via GreasyFork (recommended)

1. Go to [WME Place Harmonizer on GreasyFork](https://greasyfork.org/scripts/GigaaG/wme-place-harmonizer-row-edition)
2. Click **"Install this script"**
3. Done! Tampermonkey handles the rest

> [!INFO]  
> **Want to test beta features?** [Send me a message](https://github.com/GigaaG) for beta channel access.

---

## 🚀 How to use

### 🔦 Scan visible places
This is normally done automatically, but just to be sure. 

1. Open the Script Sidebar
2. Click **"Scan visible venues"**
3. Places are highlighted:
   - 🟢 Green – No issues
   - 🟡 Yellow – Minor issues
   - 🔴 Red – Significant issues

### 📍 Analyze a place

1. **Select a place** in WME
2. **View findings** in the feature editor panel (right side)
3. **Review suggestions** – see what's wrong and what's recommended
4. **Select fixes** – choose which changes to apply
5. **Apply** – click "Apply" to insert suggestions into the WME form
6. **Save in WME** – review and save normally in WME

---

## ✨ Validations & checks

The script performs validations based on your community's configuration. Available checks include:

### 📋 **Address**
- Is address required?
- Is address present and correctly formatted?

### 📱 **Contact information**
- Phone formatting (country-specific rules)
- URL format validation
- Are contact details required?

### 📝 **Place details**
- Editor notes (when required)
- Description quality

### 🏢 **Place information**
- Place name (unwanted cities, format issues)
- Brand/name consistency with standards
- Category compliance

### 🌐 **Google Maps validation** ⭐

Compare your place against Google Maps data:
- **Place found** – Exists on Google Maps?
- **Closed status** – Still open?
- **Location** – How far from Google's location?
- **Name** – Does it match?
- **Category** – Matching types?
- **Opening hours** – Match with Google?

> [!NOTE]  
> Communities control Google validation: enable/disable globally or per-check.

### 🔗 **Business chains** (in beta development)
- Chain recognition and matching
- Chain-specific policy validation
- ⚠️ Status: No chains added yet; coming in future releases

### ⚙️ **Category standards**
Community-defined rules for each category:
- Required fields
- Recommended fields
- Forbidden fields
- Specific policies

---

## ⚙️ Settings

Access settings via the **Script Sidebar**.

### 📊 **Scan settings**
- **Auto scan** – Enable/disable automatic scanning when panning/zooming
- **One-time scan** – Manually scan visible places (when auto scan is off)
- **Natural areas** – Include or exclude forests, water, etc.

### 🔍 **Google Maps validation**
- **Enable/disable** – Toggle globally
- **Per-check controls** – Enable/disable individual checks:
  - Place found, Closed, Location drift, Name match, Category, Opening hours

### 🔄 **Data management**
- **Reload data** – Fetch latest config and validation data from your community

---

## 📌 Whitelist: Managing exclusions

Ignore specific issues for specific places – useful for known exceptions.

### 🚫 Whitelist an issue

1. Select a place in WME
2. Click **"Whitelist this issue"** for the issue you want to ignore
3. Optionally add a note explaining why

### 🔍 Manage your whitelist

1. Open **Settings** in Script Sidebar
2. Go to **Whitelist management**
3. View and remove whitelisted issues

**Note:** Whitelist is stored locally in your browser (not shared with Waze). It's lost if you clear your browser cache.

---

## 🐛 Report errors & problems

### 🐞 Bug in the script

[Open an issue](https://github.com/GigaaG/wme-place-harmonizer-row-edition/issues):
1. Click **"New Issue"**
2. Describe: what happened, what you expected, how to reproduce
3. Include: browser version, script version, and console errors (F12 → Console, look for `WMEPH` messages)

### 📊 Error in validation data or translation

[Open an issue on the Data Repository](https://github.com/GigaaG/wme-place-harmonizer-row-data/issues):
- Incorrect translations
- Wrong validation guidelines
- Misconfigured business chains
- Any data-related issues

### 💬 Questions or ideas

Coming soon™ 
~GitHub Discussions~

---

## ❓ FAQ

### 📊 Where do standards come from?
Data comes from [wme-place-harmonizer-row-data](https://github.com/GigaaG/wme-place-harmonizer-row-data) and includes:
- Community-specific configurations
- Category guidelines
- Format standards
- Business chains (in development)
- Translations

All publicly viewable – you can see exactly what your community defines.

### 🌍 How does community configuration work?
Each community can:
- Define their own validation rules
- Enable/disable specific checks (including Google Maps checks)
- Configure category standards
- Establish regional guidelines

You automatically get your community's guidelines.

### 🌐 Language support
**Supported:** English, Dutch, French  
**Add more:** [Get involved](https://github.com/GigaaG/wme-place-harmonizer-row-data/discussions) in translations!

### 🆙 How do I get updates?
Tampermonkey checks automatically. Updates also appear on GreasyFork. Join beta testing for early access.

### 🔄 Data seems outdated
Open Script Sidebar → Settings → **"Reload data"**

### ⛓️ Why no business chains yet?
Chains are in beta development. Coming in future releases. [Follow progress](https://github.com/GigaaG/wme-place-harmonizer-row-edition).

---

## 📚 More information

- 🔗 [GitHub Repository](https://github.com/GigaaG/wme-place-harmonizer-row-edition) – Source code & releases
- 📦 [Data Repository](https://github.com/GigaaG/wme-place-harmonizer-row-data) – Community configs, guidelines, translations

---

**Questions, bugs, or suggestions? [Open a GitHub issue or discussion!](https://github.com/GigaaG/wme-place-harmonizer-row-edition)**
