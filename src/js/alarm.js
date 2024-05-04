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

document.getElementById('alarm').addEventListener('click', async function() {
  var page = document.getElementById('page');
  if (page.classList.contains('hidden')) {
    page.classList.remove('hidden');
    setTimeout(function() {
      page.classList.remove('opacity-0');
    }, 20);

    // XML 데이터를 가져옵니다.
    const rows = await fetchDisasterMsgData();
    // 페이지에 내용을 추가합니다.
    rows.forEach(row => {
      const createDate = row.querySelector('create_date').textContent;
      const p = document.createElement('p');
      p.textContent = createDate;
      page.appendChild(p);
    });
  } else {
    page.classList.add('opacity-0');
    setTimeout(function() {
      page.classList.add('hidden');
    }, 300);
  }
});