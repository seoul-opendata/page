async function fetchDisasterMsgData() {
  const apiUrl = 'https://apis.data.go.kr/1741000/DisasterMsg4/getDisasterMsg2List?ServiceKey=NH02V8Rfyl%2Btjtb5j%2FBdZmtACdWOeGyQt4ZYl9%2BueaaPkMhwMptzV1bbDddk2LhjmlLBfzs5iDbvtTMFdiVVjQ%3D%3D&type=xml&pageNo=1&numOfRows=1000&location_name=%EC%84%9C%EC%9A%B8';
  const proxyUrl = 'https://proxy.seoulshelter.info/';
  const response = await fetch(proxyUrl + apiUrl);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const rows = Array.from(xmlDoc.querySelectorAll('row'));
  return rows.slice(0, 50);
}
let disasterMsgData = null;

document.getElementById('alarm').addEventListener('click', async function() {
  var page = document.getElementById('page');
  if (page.classList.contains('show')) {
    page.classList.remove('show');
    // 페이지 내용을 초기화합니다.
    while (page.firstChild) {
      page.removeChild(page.firstChild);
    }
  } else {
    page.classList.add('show');

    // 데이터가 없을 때만 API 요청을 보냅니다.
    if (!disasterMsgData) {
      disasterMsgData = await fetchDisasterMsgData().catch(error => {
        console.error('Failed to fetch disaster message data:', error);
      });
    }

    // 페이지에 내용을 추가합니다.
    disasterMsgData.forEach(row => {
      const createDate = row.querySelector('create_date').textContent;
      const p = document.createElement('p');
      p.textContent = createDate;
      page.appendChild(p);
    });
  }
});