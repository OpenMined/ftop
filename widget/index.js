let cpuChart, memoryChart;
let systems = [];

function initializeCharts() {
  const cpuCtx = document.getElementById("cpuChart").getContext("2d");
  cpuChart = new Chart(cpuCtx, {
    type: "line",
    data: {
      labels: ["1min", "5min", "15min"],
      datasets: [],
    },
    options: {
      responsive: true,
      animation: {
        duration: 1000,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#a9b1d6",
            boxWidth: 12,
            font: {
              family: "Roboto",
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#a9b1d6",
            font: {
              family: "Roboto",
            },
          },
          grid: {
            color: "rgba(169, 177, 214, 0.1)",
            drawBorder: false,
          },
        },
        x: {
          ticks: {
            color: "#a9b1d6",
            font: {
              family: "Roboto",
            },
          },
          grid: {
            color: "rgba(169, 177, 214, 0.1)",
            drawBorder: false,
          },
        },
      },
    },
  });

  const memoryCtx = document.getElementById("memoryChart").getContext("2d");
  memoryChart = new Chart(memoryCtx, {
    type: "doughnut",
    data: {
      labels: ["Used", "Free"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#7aa2f7", "rgba(26, 27, 38, 0.5)"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      animation: {
        duration: 1000,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#a9b1d6",
            boxWidth: 12,
            font: {
              family: "Roboto",
            },
          },
        },
      },
      cutout: "70%",
    },
  });
}

function showStatus(message) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.add("visible");
  setTimeout(() => status.classList.remove("visible"), 2000);
}

function updateCharts() {
  // Update CPU chart
  cpuChart.data.datasets = systems.map((sys, index) => ({
    label: sys.email.split("@")[0],
    data: [sys.cpu_load_1min, sys.cpu_load_5min, sys.cpu_load_15min],
    borderColor: `hsl(${index * (360 / systems.length)}, 70%, 60%)`,
    backgroundColor: `hsla(${index * (360 / systems.length)}, 70%, 60%, 0.1)`,
    tension: 0.4,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
  }));
  cpuChart.update();

  // Update Memory chart
  const totalRam = systems.reduce((sum, sys) => sum + sys.total_ram, 0);
  const usedRam = systems.reduce((sum, sys) => sum + sys.used_ram, 0);
  memoryChart.data.datasets[0].data = [usedRam, totalRam - usedRam];
  memoryChart.update();

  // Update RAM usage color based on percentage
  const ramUsageElement = document.getElementById("ramUsage");
  const usagePercentage = (usedRam / totalRam) * 100;
  ramUsageElement.className =
    "metric " +
    (usagePercentage > 90 ? "danger" : usagePercentage > 70 ? "warning" : "");
}

async function loadDashboardData() {
  try {
    showStatus("Updating dashboard...");
    const response = await fetch("./dashboard_metrics.json");
    const data = await response.json();

    // Create systems array from datasites
    systems = data.datasites.map((email) => ({
      email: email,
      cpu_load_1min: data.cpu_load.average,
      cpu_load_5min: data.cpu_load.average,
      cpu_load_15min: data.cpu_load.average,
      total_ram: data.ram.total / data.total_systems,
      used_ram: data.ram.used / data.total_systems,
    }));

    // Update stats
    document.getElementById("totalSystems").textContent = data.total_systems;
    document.getElementById("totalCPUs").textContent = data.total_cpus;
    document.getElementById("avgLoad").textContent = data.cpu_load.average;
    document.getElementById("minLoad").textContent = data.cpu_load.min;
    document.getElementById("maxLoad").textContent = data.cpu_load.max;
    document.getElementById("totalRAM").textContent = `${Math.round(
      data.ram.total / 1024 / 1024 / 1024
    )} GB`;
    document.getElementById("usedRAM").textContent = `${Math.round(
      data.ram.used / 1024 / 1024 / 1024
    )} GB`;
    document.getElementById(
      "ramUsage"
    ).textContent = `${data.ram.average_usage_percentage}%`;

    // Update charts
    updateCharts();

    // Update email list with status indicators
    const emailList = document.getElementById("emailList");
    emailList.innerHTML = "";
    data.datasites.forEach((email) => {
      const div = document.createElement("div");
      div.className = "email";
      div.textContent = email;
      emailList.appendChild(div);
    });

    // Update last update time
    document.getElementById("lastUpdate").textContent =
      new Date().toLocaleString();

    showStatus("Dashboard updated successfully");
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showStatus("Error updating dashboard");
  }
}

// Initialize charts when the page loads
initializeCharts();

// Load initial data
loadDashboardData();

// Refresh data every minute
setInterval(loadDashboardData, 60000);
