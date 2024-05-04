async function fetchDisasterMsgData() {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    var url = 'https://proxy.seoulshelter.info/http://apis.data.go.kr/1741000/DisasterMsg4/getDisasterMsg2List'; /*URL*/
    var queryParams = '?' + encodeURIComponent('serviceKey') + '='+'NH02V8Rfyl%2Btjtb5j%2FBdZmtACdWOeGyQt4ZYl9%2BueaaPkMhwMptzV1bbDddk2LhjmlLBfzs5iDbvtTMFdiVVjQ%3D%3D'; /*Service Key*/
    queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /**/
    queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('50'); /**/
    queryParams += '&' + encodeURIComponent('type') + '=' + encodeURIComponent('xml'); /**/
    queryParams += '&' + encodeURIComponent('location_name') + '=' + encodeURIComponent('서울'); /**/
    xhr.open('GET', url + queryParams);
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(this.responseText, "text/xml");
          const rows = Array.from(xmlDoc.querySelectorAll('row'));
          resolve(rows.slice(0, 50));
        } else {
          reject(new Error('Request failed with status ' + this.status));
        }
      }
    };
    xhr.send('');
  });
}
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
    const disasterMsgData = await fetchDisasterMsgData().catch(error => {
      console.error('Failed to fetch disaster message data:', error);
      // 오류 메시지를 화면에 표시합니다.
      const p = document.createElement('p');
      p.textContent = '재난문자 데이터를 불러오는 데 실패했습니다.';
      page.appendChild(p);
      // 함수를 종료합니다.
      return;
    });

    // 페이지에 내용을 추가합니다.
    disasterMsgData.forEach(row => {
      const createDate = row.querySelector('create_date').textContent;
      const msg = row.querySelector('msg').textContent;
      const p = document.createElement('p');
      p.textContent = `${createDate}: ${msg}`;
      page.appendChild(p);
    });
  }
});