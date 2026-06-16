# BigQuery Release Radar ⚡

A premium, responsive dark-mode dashboard built using **Python Flask** and plain **vanilla HTML, CSS, and JavaScript**. This application parses, formats, and tracks Google Cloud's BigQuery release notes and allows you to customize and tweet specific updates directly from a built-in interactive composer drawer.

---

## ✨ Features

- **Smart Atom Feed Parser**: Google Cloud groups several updates under a single day's XML entry. The parser splits these lists by detecting category tags, producing clean, individual update cards.
- **Intelligent Caching**: Implements a 5-minute server-side memory cache to reduce external XML feed queries, with a manual **Refresh Feed** bypass control.
- **Glassmorphic Theme**: Designed with smooth neon glow backdrops, dark panels, dynamic hover animations, and HSL theme accents representing update categories:
  - 🟢 **Features**
  - 🟠 **Issues & Fixes**
  - 🟣 **Changes & Updates**
  - 🟡 **Deprecations**
- **Interactive Tweet Composer Drawer**: 
  - Automatically truncates descriptions to keep the draft within Twitter's 280-character limit (accounting for headers and documentation URLs).
  - Uses an **SVG Circular Progress Ring** that visually animates character limits (cyan/yellow/red indicators).
  - Quick hashtag badges (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`) for quick tag insertions.
  - Quick copy to clipboard and integration with the Twitter Web Intent API.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, Requests, BeautifulSoup4
- **Frontend**: Plain HTML5, Vanilla CSS3 (Custom transitions & keyframes), Vanilla JS (ES6+)
- **Typography & Icons**: FontAwesome 6, Google Fonts (Inter & Outfit)

---

## 📁 Directory Structure

```text
bq-releases-notes/
├── static/
│   ├── css/
│   │   └── style.css      # CSS styles for layout, custom scrollbar & animations
│   └── js/
│       └── app.js         # AJAX fetch, filtering, stats & tweet composer logic
├── templates/
│   └── index.html         # HTML layout for dashboard and composer drawer
├── .gitignore             # Git ignore file for python environment caches
├── app.py                 # Flask server backend, XML fetcher & feed parser
└── README.md              # Project documentation
```

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have Python installed. The required packages are `flask`, `requests`, and `beautifulsoup4`.

### 1. Install Dependencies
You can install the dependencies directly using pip:
```bash
pip install flask requests beautifulsoup4
```

### 2. Run the Application
Start the Flask server from the project directory:
```bash
python app.py
```

By default, the server runs on debug mode and listens on:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🖼️ Application Design Overview

- **Ambient Backgrounds**: Custom absolute positioned CSS radial gradient blobs to create a depth glow behind dashboard cards.
- **Dynamic Stats Summary**: Numbers animate from `0` to their respective category counts when releases load.
- **Control Bar**: Features a real-time keyword search bar and dynamic tab selectors for quick category-based filtering.
