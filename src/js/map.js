let map;
var mapData;
var proj4 = window.proj4;
var HOME_PATH = 'https://seoulshelter.info';
let markers = [];
let polygons = []; 
let rainfallData = {}; // 전역 변수로 선언
var isShelterButtonClicked = false; 
// 좌표 변환을 위한 proj4 정의
proj4.defs([
  ['EPSG:5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'],
  ['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs']
]);
async function fetchRainfallData() {
  const districts = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];

  const requests = districts.map(async district => {
      const encodedDistrict = encodeURIComponent(district);
      const apiUrl = `http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/ListRainfallService/1/5/${encodedDistrict}`;
      const proxyUrl = `https://proxy.seoulshelter.info/${apiUrl}`;
      const response = await fetch(proxyUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const rows = Array.from(xmlDoc.querySelectorAll('row'));
      if (rows.length === 0) {
          console.error(`No data for ${district}`);
          return;
      }
      const latestData = rows.reduce((latest, current) => {
          const currentReceiveTime = current.querySelector('RECEIVE_TIME').textContent;
          const latestReceiveTime = latest ? latest.querySelector('RECEIVE_TIME').textContent : null;
          return new Date(currentReceiveTime) > new Date(latestReceiveTime) ? current : latest;
      }, null);
      if (latestData) {
        rainfallData[district] = latestData.querySelector('RAINFALL10').textContent; // 강수량을 할당
      }
  });

  await Promise.all(requests);

  return rainfallData;
}
function loadScript() {
  var script = document.createElement('script');
  script.src = "https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=4qd9nt8f83";
  script.onload = function() {
      initMap();
  }; 
  document.body.appendChild(script);
}

window.onload = loadScript; 
function loadGeoJson() {
  $.ajax({
    url: HOME_PATH +'/js/seoul.json',
    dataType: 'json',
  }).done(async function(geojson) {
    console.log('Successfully loaded geojson data');
    await startDataLayer(geojson);
  }).fail(function(jqXHR, textStatus, errorThrown) {
    console.error(`Failed to load geojson data: ${textStatus}, ${errorThrown}`);
  });
}
async function initMap() {
  if (!map) {
    // 사용자의 위치 정보를 얻습니다.
    navigator.geolocation.getCurrentPosition(async function(position) {
      // 사용자의 위도와 경도를 얻습니다.
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // 사용자의 위치를 기준으로 지도를 생성합니다.
      map = new naver.maps.Map(document.getElementById("map"), {
        zoom: 12,
        mapTypeId: "normal",
        center: new naver.maps.LatLng(lat, lng),
      });

      // 강수량 데이터를 불러옵니다.
      rainfallData = await fetchRainfallData();
      // 강수량 데이터가 불러와진 후에 폴리곤을 로드합니다.
      await loadGeoJson();
    }, async function(error) {
      // 사용자가 위치 정보를 제공하지 않았거나, 다른 오류가 발생한 경우
      console.error(`Failed to get user's location: ${error}`);

      // 서울시청을 기준으로 지도를 생성합니다.
      map = new naver.maps.Map(document.getElementById("map"), {
        zoom: 12,
        mapTypeId: "normal",
        center: new naver.maps.LatLng(37.5665, 126.978),
      });

      // 강수량 데이터를 불러옵니다.
      rainfallData = await fetchRainfallData();
      // 강수량 데이터가 불러와진 후에 폴리곤을 로드합니다.
      await loadGeoJson();
    });
  }
}
document.querySelectorAll('.flood-risk-button').forEach((element) => {
  element.addEventListener('click', async function(e) {
    e.preventDefault();

    // 마커 지우기
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // 폴리곤 보이기
    polygons.forEach(function(polygon) {
      polygon.setVisible(true);
    });

  });
})

async function showShelters(map, urls) {
  const coordinatesPromises = urls.map(url => getCoordinates(url));
  const coordinatesArrays = await Promise.all(coordinatesPromises);
  const coordinates = coordinatesArrays.flat();

  coordinates.forEach(coordinate => {
    const marker = new naver.maps.Marker({
      map: map,
      icon: {
          content: [
                      '<span class="map_marker"></span>'
                  ].join(''),
          size: new naver.maps.Size(20, 20),
          anchor: new naver.maps.Point(10, 10),
      },
      position: coordinate
    });
    marker.setMap(map);
    markers.push(marker); // 마커 배열에 추가
  });
}

document.querySelectorAll('.shelter-button').forEach((element) => {
  element.addEventListener('click', async function(e) {
    e.preventDefault();

    // 폴리곤 숨기기
    polygons.forEach(function(polygon) {
      polygon.setVisible(false);
    });

    // 대피소 마커 생성
    const urls = [
      'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/TbEqkShelter/1/1000',
      'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/TbEqkShelter/1001/2000'
    ];
    showShelters(map, urls);
  });
})
async function startDataLayer(geojson) {
  try {
    // 좌표 변환
    geojson.features.forEach(feature => {
      feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map(coord => {
        const transformed = proj4('EPSG:5179', 'EPSG:4326', coord);
        return transformed;
      });
    });

    // '대피소' 버튼이 눌리지 않았을 때만 폴리곤 생성
    if (!isShelterButtonClicked) {
      // 폴리곤을 배열에 추가
      geojson.features.forEach(function(feature) {
        const district = feature.properties.nm; 
        const rainfall = rainfallData[district] ? parseFloat(rainfallData[district]) : 0;
        var color;
        if (rainfall === 0) {
          color = '#FFFFFF'; // 흰색
        } else if (rainfall <= 0.5) {
          color = '#00BE00'; // 초록색
        } else if (rainfall <= 1.5) {
          color = '#FFDC1F'; // 노란색
        } else if (rainfall <= 3) {
          color = '#FF6600'; // 주황색
        } else if (rainfall <= 4.5) {
          color = '#D20000'; // 붉은색
        } else if (rainfall <= 6.5) {
          color = '#E0A9FF'; // 연보라
        } else if (rainfall <= 8) {
          color = '#B329FF'; // 보라
        } else if (rainfall <= 11.5) {
          color = '#9300E4'; // 진보라
        } else {
          color = '#000390'; // 푸른색
        }

        // 폴리곤 생성
        var polygon = new naver.maps.Polygon({
          map: map,
          paths: feature.geometry.coordinates,
          fillColor: color,
          fillOpacity: 0.3,
          strokeColor: color,
          strokeOpacity: 0.6,
          strokeWeight: 2,
          id: feature.properties.district, 
          district: feature.properties.district 
        });

        // 이벤트 리스너 추가
        naver.maps.Event.addListener(polygon, 'mouseover', function(e) {
          polygon.setOptions({
            fillOpacity : 0.6,
            strokeWeight: 2,
            strokeOpacity: 1
          });
        });

        naver.maps.Event.addListener(polygon, 'mouseout', function(e) {
          polygon.setOptions({
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeOpacity: 0.6
          });
        });

        polygons.push(polygon);
      });
    }
  } catch (error) {
    console.error(`Failed to start data layer: ${error}`);
  }
}

async function getCoordinates(url) {
  const proxyUrl = `https://proxy.seoulshelter.info/${url}`;
  const response = await fetch(proxyUrl, {
    headers: {
      'origin': window.location.origin,
      'x-requested-with': 'XMLHttpRequest'
    }
  });
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const rowElements = xmlDoc.getElementsByTagName('row');
  if (!rowElements.length) {
    throw new Error('row tag not found in the XML document.');
  }
  const coordinates = Array.from(rowElements).map(rowElement => {
    const lonElement = rowElement.getElementsByTagName('LON')[0];
    const latElement = rowElement.getElementsByTagName('LAT')[0];
    if (!lonElement || !latElement) {
      throw new Error('LON or LAT tag not found in the row element.');
    }
    return new naver.maps.LatLng(parseFloat(latElement.textContent), parseFloat(lonElement.textContent));
  });
  return coordinates;
}

