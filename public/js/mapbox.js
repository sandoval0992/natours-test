/* eslint-disable */

export const displayMap = locations => {
  //Defines accessToken and map container
  mapboxgl.accessToken =
    "pk.eyJ1Ijoic2FuZG92YWwwOTkyIiwiYSI6ImNrOGNlZWR5bTA1Ymkza3FleGxzZHQ0b28ifQ.CfYl4qvohZluolXh4WtAig";
  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/sandoval0992/cky4o88r40bh614klxbtzywvm",
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  //Draws a marker on each location
  locations.forEach(location => {
    const marker = document.createElement("div");
    marker.className = "marker";

    new mapboxgl.Marker({
      element: marker,
      anchor: "bottom"
    })
      .setLngLat(location.coordinates)
      .addTo(map);

    //Displays a pop up window with tour description
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
      .addTo(map);

    bounds.extend(location.coordinates);
  });

  //Resizes map so that all markers can be displayed in the map section
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 200,
      right: 200
    }
  });
};
