import numpy as np
from sklearn.neighbors import KernelDensity
from sklearn.cluster import DBSCAN
import json
import logging

logging.basicConfig(level=logging.INFO)

# Dummy dataset: Lat, Lng arrays of historical "Incidents"
crime_data = np.array([
    [28.6189, 77.2170], [28.6180, 77.2180], [28.6195, 77.2165], # Cluster 1
    [28.6039, 77.2040], [28.6045, 77.2035], [28.6030, 77.2050], # Cluster 2
    [28.6300, 77.2200]  # Outlier
])

def generate_danger_zones():
    logging.info("Starting KDE (Kernel Density Estimation) for Heatmap generation...")
    # 1. KDE Mapping: Convert points to continuous probability density
    # Haversine metric ensures accurate geospatial distance calculations on a sphere
    kde = KernelDensity(kernel='gaussian', bandwidth=0.005, metric='haversine')
    # Convert lat/long to radians for haversine
    kde.fit(np.radians(crime_data))
    
    # 2. DBSCAN Clustering: Draw discrete physical boundaries (GeoJSON red zones)
    # eps=0.015 (~1.5km), min_samples=3 means at least 3 incidents inside to call it a "Danger Zone"
    logging.info("Clustering high-density crime hot-spots via DBSCAN...")
    scanner = DBSCAN(eps=0.015, min_samples=2, metric='haversine')
    labels = scanner.fit_predict(np.radians(crime_data))
    
    zones = []
    unique_labels = set(labels)
    for k in unique_labels:
        if k == -1:
            continue # noise
        class_member_mask = (labels == k)
        xy = crime_data[class_member_mask]
        
        # Calculate centroid of cluster to be the visual center of Danger Zone
        centroid = np.mean(xy, axis=0)
        
        # Output geometry
        zones.append({
            "center": [centroid[0], centroid[1]],
            "radius": 600,  # Approximate 600m radius
            "severity": "High",
            "incidents": len(xy)
        })
        
    # Output to our Backend Node API file
    with open('../Server/danger_zones.json', 'w') as f:
        json.dump(zones, f, indent=4)
        
    logging.info(f"Successfully generated {len(zones)} Danger Zones to ../Server/danger_zones.json")

if __name__ == "__main__":
    generate_danger_zones()
