    const locationButton = document.getElementById("locationButton");
    const copyButton = document.getElementById("copyButton");
    const statusPill = document.getElementById("statusPill");
    const statusText = document.getElementById("statusText");
    const permissionText = document.getElementById("permissionText");
    const addressEl = document.getElementById("address");
    const cityEl = document.getElementById("city");
    const stateEl = document.getElementById("state");
    const countryEl = document.getElementById("country");
    const latitudeEl = document.getElementById("latitude");
    const longitudeEl = document.getElementById("longitude");
    const accuracyEl = document.getElementById("accuracy");
    const timestampEl = document.getElementById("timestamp");
    const mapsUrlEl = document.getElementById("mapsUrl");
    const messageBox = document.getElementById("messageBox");

    let lastCoordinates = null;

    function setStatus(type, status, message) {
      statusPill.className = "status-pill";
      messageBox.className = "message-box";
      if (type) {
        statusPill.classList.add(type);
        messageBox.classList.add(type);
      }
      statusText.textContent = status;
      messageBox.textContent = message;
    }

    function formatNumber(value) {
      return Number(value).toFixed(6);
    }

    function resetLocationDisplay() {
      addressEl.textContent = "—";
      cityEl.textContent = "—";
      stateEl.textContent = "—";
      countryEl.textContent = "—";
      latitudeEl.textContent = "—";
      longitudeEl.textContent = "—";
      accuracyEl.textContent = "—";
      timestampEl.textContent = "—";
      mapsUrlEl.textContent = "—";
      copyButton.disabled = true;
      lastCoordinates = null;
    }

    async function getAddressFromCoordinates(latitude, longitude) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        if (!response.ok) throw new Error("Failed to fetch address");
        const data = await response.json();

        const address =
          data.address?.road ||
          data.address?.village ||
          data.address?.town ||
          data.address?.city ||
          data.display_name?.split(",")?.[0] ||
          "Location found";

        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.hamlet || "—";
        const state =
          data.address?.state ||
          data.address?.region ||
          data.address?.province ||
          data.address?.county ||
          "—";
        const country = data.address?.country || "—";

        return { address, city, state, country };
      } catch (error) {
        console.error("Geocoding error:", error);
        return { address: "Address not available", city: "—", state: "—", country: "—" };
      }
    }

    async function updatePermissionMessage() {
      if (!("permissions" in navigator) || !navigator.permissions.query) {
        permissionText.textContent = "Your browser will ask for location permission when needed.";
        return;
      }

      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        const messages = {
          granted: "Location permission is already granted for this site.",
          prompt: "Your browser will ask for location permission when you click the button.",
          denied: "Location permission is currently denied for this site. Update site permissions to use this app."
        };
        permissionText.textContent = messages[permission.state] || "Location permission status is unknown.";
        permission.onchange = () => {
          permissionText.textContent = messages[permission.state] || "Location permission status changed.";
        };
      } catch (error) {
        permissionText.textContent = "Your browser will ask for location permission when needed.";
      }
    }

    function playFoundSound() {
      try {
        // Put your local sound file in the project folder (same level as index.html)
        // and set this filename to match exactly.
        const audio = new Audio("sound.mp3"); // e.g. "alert.wav" / "beep.ogg"
        audio.volume = 1.0;
        audio.play().catch(() => {});
      } catch (e) {
        console.warn("Audio playback failed:", e);
      }
    }


    async function showPosition(position) {
      const { latitude, longitude, accuracy } = position.coords;
      const lat = formatNumber(latitude);
      const lon = formatNumber(longitude);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      const { address, city, state, country } = await getAddressFromCoordinates(latitude, longitude);

      lastCoordinates = { latitude: lat, longitude: lon, mapsUrl };
      addressEl.textContent = address;
      cityEl.textContent = city || "—";
      stateEl.textContent = state || "—";
      countryEl.textContent = country || "—";
      latitudeEl.textContent = lat;
      longitudeEl.textContent = lon;
      accuracyEl.textContent = accuracy ? `${Math.round(accuracy)} meters` : "Not provided";
      timestampEl.textContent = new Date(position.timestamp).toLocaleString();
      mapsUrlEl.textContent = mapsUrl;
      copyButton.disabled = false;

      setStatus("success", "Location found", "Success! Your exact location and coordinates were retrieved from the browser Geolocation API.");
      updatePermissionMessage();
      playFoundSound();
    }





    function showLocationError(error) {
      resetLocationDisplay();


      if (error.code === error.PERMISSION_DENIED) {
        setStatus("error", "Permission denied", "Location permission was denied. Allow location access in your browser settings, then try again.");
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setStatus("error", "Location unavailable", "Your location could not be determined. Check GPS, Wi-Fi, or network settings and try again.");
      } else if (error.code === error.TIMEOUT) {
        setStatus("warning", "Request timed out", "The location request took too long. Move to an area with a better signal or try again.");
      } else {
        setStatus("error", "Unknown location error", "Something went wrong while requesting your location. Please try again.");
      }

      updatePermissionMessage();
    }

    function getCurrentLocation() {
      if (!("geolocation" in navigator)) {
        resetLocationDisplay();
        setStatus("error", "Geolocation unsupported", "This browser does not support the Geolocation API. Try a modern browser like Chrome, Edge, Firefox, or Safari.");
        return;
      }

      if (!window.isSecureContext) {
        resetLocationDisplay();
        setStatus("warning", "Secure context required", "Geolocation usually requires HTTPS or localhost. Open this project on localhost or deploy it with HTTPS.");
        return;
      }

      locationButton.disabled = true;
      locationButton.textContent = "Finding location...";
      setStatus("warning", "Requesting permission", "The browser may ask for permission. Choose Allow to share your current location with this page.");

      navigator.geolocation.getCurrentPosition(
        position => {
          locationButton.disabled = false;
          locationButton.textContent = "Get my current location";
          showPosition(position);
        },
        error => {
          locationButton.disabled = false;
          locationButton.textContent = "Get my current location";
          showLocationError(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    async function copyCoordinates() {
      if (!lastCoordinates) return;
      const text = `${lastCoordinates.latitude}, ${lastCoordinates.longitude}`;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("success", "Coordinates copied", `Copied coordinates: ${text}`);
      } catch (error) {
        setStatus("warning", "Copy manually", `Copy these coordinates manually: ${text}`);
      }
    }

    locationButton.addEventListener("click", getCurrentLocation);
    copyButton.addEventListener("click", copyCoordinates);
    updatePermissionMessage();