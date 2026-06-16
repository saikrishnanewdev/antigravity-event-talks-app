import os
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # 5 minutes in seconds

# Simple in-memory cache
feed_cache = {
    "data": None,
    "last_fetched": 0
}

def parse_release_notes(xml_data):
    """
    Parses the BigQuery Release Notes Atom feed and extracts individual updates.
    """
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_updates = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        updated_str = entry.find('atom:updated', ns).text
        entry_id = entry.find('atom:id', ns).text
        
        # Link might be present in atom feed
        link_elem = entry.find('atom:link', ns)
        link_url = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or not content_elem.text:
            continue
            
        # Parse the HTML content to extract categories and individual release notes
        soup = BeautifulSoup(content_elem.text, 'html.parser')
        
        current_type = None
        current_html_parts = []
        
        # The XML feed contains multiple h3 headers (Feature, Issue, Changed, etc.)
        # and paragraph/list tags under a single date entry.
        for child in soup.contents:
            # Skip empty whitespace string nodes
            if isinstance(child, str) and not child.strip():
                continue
                
            if child.name == 'h3':
                # Save the accumulated update item before starting a new one
                if current_type and current_html_parts:
                    item_html = "".join(str(p) for p in current_html_parts)
                    item_soup = BeautifulSoup(item_html, 'html.parser')
                    item_text = item_soup.get_text(separator=' ').strip()
                    parsed_updates.append({
                        'date': date_str,
                        'updated': updated_str,
                        'type': current_type,
                        'html': item_html,
                        'text': item_text,
                        'id': entry_id,
                        'link': link_url
                    })
                current_type = child.get_text().strip()
                current_html_parts = []
            else:
                if current_type:
                    current_html_parts.append(child)
                else:
                    # Fallback for any content before a heading
                    current_type = "Update"
                    current_html_parts.append(child)
                    
        # Append the final item for the entry
        if current_type and current_html_parts:
            item_html = "".join(str(p) for p in current_html_parts)
            item_soup = BeautifulSoup(item_html, 'html.parser')
            item_text = item_soup.get_text(separator=' ').strip()
            parsed_updates.append({
                'date': date_str,
                'updated': updated_str,
                'type': current_type,
                'html': item_html,
                'text': item_text,
                'id': entry_id,
                'link': link_url
            })
            
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check if cache is valid
    if not force_refresh and feed_cache["data"] and (current_time - feed_cache["last_fetched"] < CACHE_DURATION):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_updated": feed_cache["last_fetched"],
            "data": feed_cache["data"]
        })
        
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        updates = parse_release_notes(response.content)
        
        # Update cache
        feed_cache["data"] = updates
        feed_cache["last_fetched"] = current_time
        
        return jsonify({
            "status": "success",
            "source": "live",
            "last_updated": current_time,
            "data": updates
        })
    except Exception as e:
        # Fallback to cache if request fails and cache exists
        if feed_cache["data"]:
            return jsonify({
                "status": "warning",
                "message": f"Failed to fetch live updates ({str(e)}). Serving cached data.",
                "source": "cache_fallback",
                "last_updated": feed_cache["last_fetched"],
                "data": feed_cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Running on local port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
