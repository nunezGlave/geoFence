import React, { useState, useEffect } from "react";
import MapView, { Marker, Polygon, MapPressEvent } from "react-native-maps";
import {
  StyleSheet,
  View,
  Button,
  Alert,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import * as Location from "expo-location";
import { FontAwesome } from "@expo/vector-icons";
import buildingImage from "../assets/images/building.png";
import { Platform } from "react-native";

export default function App() {
  // Set initial region to Utah's central coordinates
  const [region, setRegion] = useState({
    latitude: 40.281327,
    longitude: -111.73086,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const isAltitudeInRange = (
    altitude: number | null,
    minAltitude: string,
    maxAltitude: string
  ): boolean => {
    if (altitude === null) return false;

    const min = parseFloat(minAltitude);
    const max = parseFloat(maxAltitude);

    return altitude >= min && altitude <= max;
  };

  const [markers, setMarkers] = useState<
    Array<{
      latitude: number;
      longitude: number;
      pinColor: string;
      fillColor: string;
    }>
  >([]);

  const [isGeofenceSet, setIsGeofenceSet] = useState(false);
  const [altitude, setAltitude] = useState<number>(0);
  const [minAltitude, setMinAltitude] = useState("");
  const [maxAltitude, setMaxAltitude] = useState("");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }
      await fetchAltitude();
    })();
  }, []);

  const fetchAltitude = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude, altitude } = location.coords;

      // Update region with current GPS location
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Update current position state
      setAltitude(altitude || 0);
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  const addMarker = (event: MapPressEvent) => {
    if (!isGeofenceSet) {
      setMarkers([
        ...markers,
        {
          ...event.nativeEvent.coordinate,
          pinColor: "#2e3a8b",
          fillColor: "rgba(46, 58, 139, 0.3)",
        },
      ]);
    }
  };

  const setGeofence = () => {
    if (markers.length >= 3) {
      setIsGeofenceSet(true);
      monitorLocation();
    } else {
      Alert.alert("Please select at least 3 points to create a fence.");
    }
  };

  const resetGeofence = () => {
    setMarkers([]);
    setIsGeofenceSet(false);
  };

  const monitorLocation = async () => {
    await Location.watchPositionAsync({ distanceInterval: 1 }, (location) => {
      const { latitude, longitude, altitude } = location.coords;
      const insideGeofence = isPointInPolygon({ latitude, longitude }, markers);
      setAltitude(altitude || 0);

      if (
        insideGeofence &&
        isAltitudeInRange(altitude, minAltitude, maxAltitude)
      ) {
        setMarkers((prevMarkers) =>
          prevMarkers.map((marker) => ({
            ...marker,
            pinColor: "#2E8B57", // Green color when inside range
            fillColor: "rgba(46, 139, 87, 0.4)", // Change fillColor for inside range
          }))
        );

        Alert.alert(
          "Success",
          "You are within the geofence and altitude range!"
        );
      } else {
        setMarkers((prevMarkers) =>
          prevMarkers.map((marker) => ({
            ...marker,
            pinColor: "#8B0000", // Red color when outside range
            fillColor: "rgba(139, 0, 0, 0.4)", // Change fillColor for outside range
          }))
        );
      }
    });
  };

  const isPointInPolygon = (
    point: { latitude: number; longitude: number },
    polygon: Array<{ latitude: number; longitude: number }>
  ): boolean => {
    let x = point.latitude;
    let y = point.longitude;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  };

  // Rendering app
  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} onPress={addMarker}>
        {markers.map(
          (
            marker,
            index // Render the markers on the map
          ) => (
            <Marker
              key={`${index}-${marker.pinColor}`}
              coordinate={marker}
              pinColor={marker.pinColor}
            />
          )
        )}
        {
          // Render the current position marker
          <Marker coordinate={region}>
            <Image source={buildingImage} style={styles.markerGPS} />
          </Marker>
        }
        {markers.length >= 3 && ( // Render polygon fillColor
          <Polygon coordinates={markers} fillColor={markers[0]?.fillColor} />
        )}
      </MapView>
      <View style={styles.altitudeContainer}>
        <Text style={styles.heightText}>
          Altitude: {altitude.toFixed(2)} meters
        </Text>
        <TouchableOpacity onPress={fetchAltitude}>
          <FontAwesome
            name="refresh"
            size={20}
            color="#fff"
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.altitudeRangeContainer}>
        <Text style={styles.label}>Min Alt:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={minAltitude}
          onChangeText={(text) => setMinAltitude(text.replace(/[^0-9]/g, ""))}
          placeholder="Enter"
        />
        <Text style={styles.label}>Max Alt:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={maxAltitude}
          onChangeText={(text) => setMaxAltitude(text.replace(/[^0-9]/g, ""))}
          placeholder="Enter"
        />
      </View>
      <View style={styles.btnContainer}>
        <Button
          title="Set Fence"
          onPress={setGeofence}
          disabled={isGeofenceSet}
          color="#231bbf"
        />
        <Button title="Reset Fence" onPress={resetGeofence} color="#bf6d1b" />
      </View>
    </View>
  );
}

// Componet styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  altitudeContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 5,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  heightText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  icon: {
    marginLeft: 8,
  },
  altitudeRangeContainer: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 5,
    borderRadius: 5,
  },
  label: {
    fontSize: 16,
    marginRight: 5,
  },
  input: {
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 5,
    width: 60,
    padding: 5,
    textAlign: "center",
  },
  btnContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  markerGPS: {
    width: 60,
    height: 50,
  },
});
