// Lấy giá trị currentRoom từ localStorage, nếu không có thì mặc định là "phongkhach"
let currentRoom = localStorage.getItem('currentRoom') || "phongkhach";
let myChart; // Biến để lưu biểu đồ

// Hàm để sinh dữ liệu ngẫu nhiên
function generateRandomData(numDevices) {
    let randomData = Array.from({ length: numDevices }, () => Math.random());
    const total = randomData.reduce((acc, val) => acc + val, 0);
    return randomData.map(value => (value / total) * 100); // Chuyển đổi thành phần trăm
}

// Dữ liệu cho từng phòng với thiết bị cụ thể
const roomData = {
    "phongkhach": {
        labels: ["Lamps", "A/C", "TV", "Music"],
        data: generateRandomData(4), // Dữ liệu cho phòng khách
    },
    "phongngu": {
        labels: ["Lamps", "A/C", "TV", "Music"],
        data: generateRandomData(4), // Dữ liệu cho phòng ngủ
    },
    "nhabep": {
        labels: ["Lamps", "Cooker", "Refrigerator", "Music", "Extinguisher"],
        data: generateRandomData(5), // Dữ liệu cho nhà bếp
    },
};

// Cập nhật dữ liệu cho biểu đồ dựa trên phòng hiện tại
const updateChartData = () => {
    const chartData = roomData[currentRoom];
    
    const ul = document.querySelector(".programming-stats .details ul");

    // Nếu biểu đồ đã tồn tại, hủy nó
    if (myChart) {
        myChart.destroy();
    }

    // Khởi tạo biểu đồ mới
    const ctx = document.querySelector(".my-chart");
    myChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: "Device usage",
                    data: chartData.data,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#FF9F40'],
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                },
            },
        },
    });

    // Cập nhật danh sách hiển thị
    const populateUl = () => {
        ul.innerHTML = ''; // Xóa các mục trước đó
        chartData.labels.forEach((label, index) => {
            let li = document.createElement("li");
            li.innerHTML = `${label}: <span class='percentage'>${chartData.data[index].toFixed(2)}%</span>`;
            ul.appendChild(li);
        });
    };

    populateUl(); // Gọi hàm để hiển thị dữ liệu
};  


// Cập nhật phòng hiện tại
function changeRoom(newRoom) {
    currentRoom = newRoom; // Cập nhật phòng hiện tại
    localStorage.setItem('currentRoom', currentRoom); // Lưu vào localStorage
    updateChartData(); // Cập nhật dữ liệu cho biểu đồ
}

// Hàm để xử lý chuyển đổi phòng
function handleRoomChange(room, url) {
  changeRoom(room);
   // Cập nhật phòng
  setTimeout(() => {
    location.href = url;
  }, 100);
}

// Khởi động dữ liệu cho lần đầu tiên
updateChartData();

// Hàm để thiết lập đồng hồ AQI
function setDial(aqi) {
  let angle = getAQIDialAngle(aqi);
  let [bg, white] = getAQIColor(aqi);
  let meter = document.querySelector(".gauge > div[role=meter]");
  let dial = meter.querySelector(".dial");
  
  // Cập nhật thuộc tính ARIA cho khả năng truy cập
  meter.setAttribute("aria-valuenow", aqi);
  meter.setAttribute("aria-valuetext", aqi);
  
  // Cập nhật giá trị AQI và góc quay
  dial.querySelector(".aqi-num").textContent = aqi;
  dial.querySelector(".arrow").style.transform = `rotate(${angle - 90}deg)`;
  dial.style.backgroundColor = bg;
  dial.classList.toggle("white", white);
}

// Hàm để tính toán góc quay của đồng hồ AQI
function getAQIDialAngle(aqi) {
  if (aqi >= 301) return Math.min((aqi - 301) / 200 * 30 + 150, 180);
  if (aqi >= 201) return (aqi - 201) / 100 * 30 + 120;
  if (aqi >= 151) return (aqi - 151) / 50 * 30 + 90;
  if (aqi >= 101) return (aqi - 101) / 50 * 30 + 60;
  if (aqi >= 51) return (aqi - 51) / 50 * 30 + 30;
  return aqi / 50 * 30;
}

// Hàm để lấy màu sắc tương ứng với AQI
function getAQIColor(aqi) {
  const aqiColorMap = [
      [0, [10, 205, 10]], [15, [50, 205, 50]],
      [70, [255, 255, 0]], [125, [255, 140, 0]],
      [165, [255, 0, 0]], [240, [148, 0, 211]],
      [375, [128, 0, 0]], [500, [80, 0, 0]]
  ];

  for (let i = 0; i < aqiColorMap.length; i++) {
      let [target, color] = aqiColorMap[i];
      if (target > aqi) {
          if (i === 0) return calculateColors(color, color, 1);
          let [prevTarget, prevColor] = aqiColorMap[i - 1];
          return calculateColors(prevColor, color, (aqi - prevTarget) / (target - prevTarget));
      }
  }
  
  let [, color] = aqiColorMap[aqiColorMap.length - 1];
  return calculateColors(color, color, 1);
}

// Hàm để kết hợp hai màu
function combineColors(c1, c2, bias) {
  return c1.map((c, i) => Math.round(c * (1 - bias) + c2[i] * bias));
}

// Hàm để chuyển đổi màu sắc thành chuỗi
function stringifyColor(c) {
  return `rgb(${c.join(',')})`;
}

// Hàm để tính toán màu sắc
function calculateColors(c1, c2, bias) {
  let bg = combineColors(c1, c2, bias);
  let white = ((bg[0] * 299) + (bg[1] * 587) + (bg[2] * 114)) / 1000 < 128;
  return [stringifyColor(bg), white];
}

// Cập nhật đồng hồ AQI với giá trị ban đầu
let range = document.getElementById("aqi-num");
setDial(range.textContent);

// Lắng nghe sự kiện thay đổi giá trị AQI
range.addEventListener("change", evt => {
  setDial(evt.target.value);
});

// Cập nhật giá trị AQI từ Firebase
function updateAQINum() {
  const aqinum = document.getElementById('aqi-num');
  const aqiValue = airdisplay.textContent;
  aqinum.textContent = aqiValue;
  setDial(aqiValue);
}

// Hàm để cập nhật thời gian
function dongho() {
  const time = new Date();
  const gio = String(time.getHours()).padStart(2, '0');
  const phut = String(time.getMinutes()).padStart(2, '0');
  document.getElementById("time").innerHTML = `${gio}:${phut}`;
  setTimeout(dongho, 1000);
}
dongho();

function toggleDevice(element) {
  const statusElement = element.querySelector('.device-status');
  const deviceId = element.getAttribute('data-device-id');
  const room = element.getAttribute('data-room');
  
  // Toggle device state
  element.classList.toggle('active');
  element.classList.toggle('on');
  const isOn = element.classList.contains('on');
  statusElement.textContent = isOn ? 'On' : 'Off';
  
  // Save state to localStorage
  localStorage.setItem(deviceId, isOn ? 'On' : 'Off');
  
  // Update state in Firebase
  firebase.database().ref(room).child(deviceId).set(isOn ? 1 : 0)
      .then(() => console.log(`Updated ${deviceId} to ${isOn ? 1 : 0} in Firebase.`))
      .catch(error => console.error("Error updating device state: ", error));
  
  // Update chart data
  updateChart();
}


// Hàm để tải trạng thái thiết bị từ localStorage
function loadDeviceStates() {
  const devices = document.querySelectorAll('.device');
  devices.forEach(device => {
      const deviceId = device.getAttribute('data-device-id');
      const savedState = localStorage.getItem(deviceId);
      const statusElement = device.querySelector('.device-status');

      if (savedState) {
          statusElement.innerText = savedState;
          device.classList.toggle('on', savedState === 'On');
      } else {
          statusElement.innerText = 'Off';
          device.classList.remove('on');
      }
  });
}
window.onload = loadDeviceStates;

// Hàm để hiển thị dữ liệu từ Firebase
function show() {
  dbRefTemperature.on('value', snap => {
      temperatureDisplay.innerText = `${snap.val()}°C`;
  });

  dbRefHumidity.on('value', snap => {
      humidityDisplay.innerText = `${snap.val()}%`;
  });

  dbRefAirQuality.on('value', snap => {
      airdisplay.innerText = `${snap.val()}`;
      updateAQINum();
  });
}
show();

// Tham chiếu đến Firebase
const dbRefLight = firebase.database().ref("Phongkhach").child("anhsang");
const dbRefLamp = firebase.database().ref("Phongkhach").child("lamps");

// Cập nhật trạng thái đèn dựa trên giá trị ánh sáng
function updateLampState(lightValue) {
  const isOn = lightValue === 0;
  dbRefLamp.set(isOn ? 1 : 0)
      .then(() => {
          console.log(`Lamp turned ${isOn ? 'ON' : 'OFF'} due to light value ${lightValue}.`);
          const lampElement = document.querySelector('.device[data-device-id="lamps"]');
          lampElement.classList.toggle('on', isOn);
          lampElement.querySelector('.device-status').textContent = isOn ? 'On' : 'Off';
      })
      .catch(error => console.error(`Error updating lamp state: `, error));
}

// Lắng nghe thay đổi giá trị ánh sáng
dbRefLight.on('value', snapshot => {
  const lightValue = snapshot.val();
  updateLampState(lightValue);
});

// Xử lý sự kiện cho bình chữa cháy
const extinguisherElement = document.querySelector('.device[data-device-id="exit"]');
extinguisherElement.addEventListener('click', () => {
    flashRedBackground(); // Gọi hàm nhấp nháy nền màu đỏ
});

// Hàm nhấp nháy nền màu đỏ
function flashRedBackground() {
    document.body.style.backgroundColor = 'red';
    let count = 0;
    const interval = setInterval(() => {
        document.body.style.backgroundColor = (count % 2 === 0) ? 'red' : '';
        count++;
        if (count > 10) {
            clearInterval(interval); // Dừng nhấp nháy sau 10 lần
            document.body.style.backgroundColor = ''; // Khôi phục màu nền
        }
    }, 500);
}
