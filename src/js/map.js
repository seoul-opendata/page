let map;
var mapData;
var proj4 = window.proj4;
var HOME_PATH = 'https://seoulshelter.info';
let markers = [];
var isShelterButtonClicked = false; 

// 좌표 변환을 위한 proj4 정의
proj4.defs([
  ['EPSG:5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'],
  ['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs']
]);
async function fetchRainfallData() {
  const districts = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];
  const rainfallData = {};

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
      rainfallData[district] = latestData
  });

  await Promise.all(requests);

  return rainfallData;
}

function updateMapStyle(map, rainfallData) {
  map.data.setStyle(function(feature) {
      const district = feature.getProperty('district');
      const rainfall = rainfallData[district] ? Number(rainfallData[district].textContent) : 0;
      var color = rainfall > 0 ? 'skyblue' : '#ffffff';  

      return {
          fillColor: color,
          fillOpacity: feature.getProperty('focus') || rainfall > 0 ? 0.6 : 0.6, // fillOpacity 값을 0.6으로 설정
          strokeColor: color,
          strokeWeight: feature.getProperty('focus') || rainfall > 0 ? 4 : 2,
          strokeOpacity: 1
      };
  });

map.data.addListener('mouseover', function(e) {
  const district = e.feature.getProperty('district');
  const rainfall = rainfallData[district] ? Number(rainfallData[district].textContent) : 0;
  var color = rainfall > 0 ? 'blue' : 'green';

  map.data.overrideStyle(e.feature, {
      fillOpacity : 0.6,
      fillColor: color,
      strokeColor: color,
      strokeWeight: 2,
      strokeOpacity: 1
  });
});

  map.data.addListener('mouseout', function(e) {
      map.data.revertStyle();
  });
}

function loadScript() {
  var script = document.createElement('script');
  script.src = "https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=4qd9nt8f83";
  script.onload = function() {
      initMap();
      loadGeoJson();
  }; 
  document.body.appendChild(script);
}
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

window.onload = loadScript; // 페이지가 완전히 로드된 후에 loadScript 함수를 호출합니다.

function handleMouseOver(e) {
  map.data.overrideStyle(e.feature, {
    fillOpacity : 0.6,
    fillColor: '#0f0',
    strokeColor: '#0f0',
    strokeWeight: 2,
    strokeOpacity: 1
  });
}

function handleMouseOut(e) {
  var feature = e.feature;
  map.data.overrideStyle(feature, {
      fillOpacity: 0.0001,
      fillColor: '#ffffff',
      strokeColor: '#ffffff',
      strokeWeight: 2,
      strokeOpacity: 1
  });
}
function initMap() {
  // 맵이 이미 초기화되었는지 확인
  if (!map) {
    map = new naver.maps.Map(document.getElementById("map"), {
      zoom: 12,
      mapTypeId: "normal",
      center: new naver.maps.LatLng(37.5665, 126.978), // 서울시청
    });
  }

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

document.querySelector('#flood-risk-button').addEventListener('click', async function(e) {
  e.preventDefault();

  // 맵 초기화
  initMap();

  // 폴리곤 보이기
  loadGeoJson();
});

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
    console.log(`Adding marker: ${marker}`); 
    marker.setMap(map);
    markers.push(marker); // 마커 배열에 추가
  });
}
document.querySelector('#shelter-button').addEventListener('click', async function(e) {
  e.preventDefault();

  // 맵 초기화
  initMap();

  // 대피소 마커 생성
  const urls = [
    'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/TbEqkShelter/1/1000',
    'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/TbEqkShelter/1001/2000'
  ];
  showShelters(map, urls);
});


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
      map.data.addGeoJson(geojson);

      map.data.addListener('click', function(e) {
        var feature = e.feature;

        if (feature.getProperty('focus') !== true) {
          feature.setProperty('focus', true);
        } else {
          feature.setProperty('focus', false);
        }
      });

      map.data.addListener('mouseover', handleMouseOver);
      map.data.addListener('mouseout', handleMouseOut);
      const rainfallData = await fetchRainfallData();
      updateMapStyle(map, rainfallData);
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

