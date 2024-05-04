let map;
var mapData;
var proj4 = window.proj4;
var HOME_PATH = 'https://seoulshelter.info';
let shelterMarkers = [];
let polygons = [];
let markerClustering;
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
    // 서울시청을 기준으로 지도를 생성합니다.
    map = new naver.maps.Map(document.getElementById("map"), {
      zoom: 12,
      mapTypeId: "normal",
      center: new naver.maps.LatLng(37.5665, 126.978),
    });

    // 로딩 팝업을 보여줍니다.
    document.getElementById('loading-popup').style.display = 'block';

    // 강수량 데이터를 불러옵니다.
    rainfallData = await fetchRainfallData();
    // 강수량 데이터가 불러와진 후에 폴리곤을 로드합니다.
    await loadGeoJson();

    // 로딩 팝업을 숨깁니다.
    document.getElementById('loading-popup').style.display = 'none';
  }
}
document.addEventListener('DOMContentLoaded', (event) => {
  document.querySelector('.my-position').addEventListener('click', async function() {
    // 사용자의 위치 정보를 얻습니다.
    navigator.geolocation.getCurrentPosition(async function(position) {
      // 사용자의 위도와 경도를 얻습니다.
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // 사용자의 위치를 기준으로 지도의 중심을 이동하고, 레벨을 확대합니다.
      map.setCenter(new naver.maps.LatLng(lat, lng));
      map.setZoom(17); // 사용자 위치 줌레벨 

      // 사용자의 위치에 마커를 추가합니다.
      new naver.maps.Marker({
        map: map,
        position: new naver.maps.LatLng(lat, lng)
      });
    }, function(error) {
      // 사용자가 위치 정보를 제공하지 않았거나, 다른 오류가 발생한 경우
      console.error(`Failed to get user's location: ${error}`);
    });
  });
});
document.querySelectorAll('.flood-risk-button').forEach((element) => {
  element.addEventListener('click', async function(e) {
    e.preventDefault();

    // 대피소 마커 숨기기
    shelterMarkers.forEach(function(marker) {
      marker.setVisible(false);
    });

    // 클러스터 숨기기
    if (markerClustering) {
      markerClustering.setMap(null);
    }

    // 폴리곤 보이기
    polygons.forEach(function(polygon) {
      polygon.setVisible(true);
    });
  });
});
async function showShelters(map, urls, getCoordinates) {
  // 로딩 팝업을 보여줍니다.
  document.getElementById('loading-popup').style.display = 'block';

  const coordinates = [];
  for (const url of urls) {
    const urlCoordinates = await getCoordinates(url);
    coordinates.push(...urlCoordinates);
  }

  const markers = coordinates.map(coordinate => {
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
    marker.setMap(map); // 마커를 생성하자마자 보입니다.
    return marker;
  });

  // 클러스터링을 적용합니다.
  markerClustering = new MarkerClustering({
    minClusterSize: 2,
    maxZoom: 14,
    map: map,
    markers: markers, // 생성된 마커를 사용합니다.
    disableClickZoom: false,
    gridSize: 120,
    icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
    indexGenerator: [10, 100, 200, 500, 1000],
    stylingFunction: function(clusterMarker, count) {
      $(clusterMarker.getElement()).find('div:first-child').text(count);
    }
  });

  // 로딩 팝업을 숨깁니다.
  document.getElementById('loading-popup').style.display = 'none';

  // 마커 배열을 반환합니다.
  return markers;
}

// 클러스터 마커 아이콘을 정의합니다.
const htmlMarker1 = {
  content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url(/images/cluster-marker-1.png);background-size:contain;"></div>',
  size: new naver.maps.Size(40, 40),
  anchor: new naver.maps.Point(20, 20)
};
const htmlMarker2 = {
  content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url(/images/cluster-marker-2.png);background-size:contain;"></div>',
  size: new naver.maps.Size(40, 40),
  anchor: new naver.maps.Point(20, 20)
};
const htmlMarker3 = {
  content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url(/images/cluster-marker-3.png);background-size:contain;"></div>',
  size: new naver.maps.Size(40, 40),
  anchor: new naver.maps.Point(20, 20)
};
const htmlMarker4 = {
  content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url(/images/cluster-marker-4.png);background-size:contain;"></div>',
  size: new naver.maps.Size(40, 40),
  anchor: new naver.maps.Point(20, 20)
};
const htmlMarker5 = {
  content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url(/images/cluster-marker-5.png);background-size:contain;"></div>',
  size: new naver.maps.Size(40, 40),
  anchor: new naver.maps.Point(20, 20)
};

document.querySelectorAll('.shelter-button-1').forEach((element) => {
  element.addEventListener('click', async function(e) {
    e.preventDefault();

    // 폴리곤 숨기기
    polygons.forEach(function(polygon) {
      polygon.setVisible(false);
    });

    // 대피소 마커가 없다면 생성
    if (shelterMarkers.length === 0) {
      const urls = [
        'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/TbGtnVictP/1/1000',
        'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/TbGtnVictP/1001/2000'
      ];
      shelterMarkers = await showShelters(map, urls, getCoordinatesFromXY);
    }

    // 대피소 마커 보이기
    shelterMarkers.forEach(marker => marker.setVisible(true));

    // 클러스터 보이기
    if (markerClustering) {
      markerClustering.setMap(map);
    }
  });
});
document.querySelectorAll('.shelter-button-2').forEach((element) => {
  element.addEventListener('click', async function(e) {
    e.preventDefault();

    // 폴리곤 숨기기
    polygons.forEach(function(polygon) {
      polygon.setVisible(false);
    });

    // 대피소 마커가 없다면 생성
    if (shelterMarkers.length === 0) {
      const url = 'http://openapi.seoul.go.kr:8088/6753785770686f6a37374d596d6e6d/xml/shuntPlace0522/1/1000';
      shelterMarkers = await showShelters(map, [url], getCoordinatesFromAddress);
    }
    // 대피소 마커 보이기
    shelterMarkers.forEach(marker => marker.setVisible(true));

    // 클러스터 보이기
    if (markerClustering) {
      markerClustering.setMap(map);
    }
  });
});

async function getCoordinatesFromXY(url) {
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
    console.error(`No row tag found in the XML document for URL: ${url}`);
    return [];
  }
  const coordinates = Array.from(rowElements).map(rowElement => {
    const xElement = rowElement.getElementsByTagName('XCORD')[0];
    const yElement = rowElement.getElementsByTagName('YCORD')[0];
    if (!xElement || !yElement) {
      throw new Error('XCORD or YCORD tag not found in the row element.');
    }
    const x = parseFloat(xElement.textContent);
    const y = parseFloat(yElement.textContent);
    return new naver.maps.LatLng(y, x);
  });
  return coordinates;
}

async function getCoordinatesFromAddress(url) {
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
    console.error(`No row tag found in the XML document for URL: ${url}`);
    return [];
  }
  const addresses = Array.from(rowElements).map(rowElement => {
    const addressElement = rowElement.getElementsByTagName('ADR_NAM')[0];
    if (!addressElement) {
      throw new Error('ADR_NAM tag not found in the row element.');
    }
    const address = addressElement.textContent;
    console.log(`ADR_NAM: ${address}`); // ADR_NAM 값을 콘솔에 출력
    return address;
  });

  const coordinatePromises = addresses.map((address) => {
    return new Promise((resolve, reject) => {
      if (!address) {
        console.error('Address is undefined or empty.');
        reject(`Failed to get coordinates from address: ${address}`);
        return;
      }

      naver.maps.Service.geocode({
        query: address
      }, function(status, response) {
        if (status === naver.maps.Service.Status.ERROR) {
          console.error('Something went wrong:', response.error);
          reject(`Failed to get coordinates from address: ${address}`);
          return;
        }

        if (!response.result.items) {
          console.error('No items in the response:', response);
          reject(`Failed to get coordinates from address: ${address}`);
          return;
        }

        const { x, y } = response.result.items[0].point;
        const latLng = new naver.maps.LatLng(y, x);
        console.log(`Coordinates for ${address}: ${latLng}`); // 좌표를 콘솔에 출력
        resolve(latLng);
      });
    }).catch(error => {
      console.error(`Failed to get coordinates from address: ${address}. Error: ${error}`);
    });
  });

  const coordinates = await Promise.all(coordinatePromises);
  return coordinates.filter(coordinate => coordinate); // undefined 값을 제거
}
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
          color = '#CCE7FF'; // 비안올때 색
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
          color = '#000147'; // 짙은 푸른색
        }

        // 폴리곤 생성
        var polygon = new naver.maps.Polygon({
          map: map,
          paths: feature.geometry.coordinates,
          fillColor: color,
          fillOpacity: 0.3,
          strokeColor: '#000000', // 테두리 색상을 검은색으로 설정합니다.
          strokeOpacity: 0.6,
          strokeWeight: 2, // 테두리 두께를 3으로 설정합니다.
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

