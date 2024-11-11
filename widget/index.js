let cpuChart, memoryChart, historicalCPUChart, historicalRAMChart;
let systems = [];

function showStatus(message) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.add("visible");
  setTimeout(() => status.classList.remove("visible"), 2000);
}

function initializeCharts() {
  // Standard CPU chart
  const cpuCtx = document.getElementById("cpuChart").getContext("2d");
  cpuChart = new Chart(cpuCtx, {
    type: "line",
    data: {
      labels: ["1min", "5min", "15min"],
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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

  // Current Memory Usage Doughnut
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
      maintainAspectRatio: false,
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

  // Historical Chart Options
  const historicalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#a9b1d6",
          font: {
            family: "Roboto",
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          title: function (context) {
            return new Date(context[0].parsed.x).toLocaleString();
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "hour",
          displayFormats: {
            hour: "MMM d, HH:mm", // Changed 'D' to 'd'
          },
        },
        ticks: {
          color: "#a9b1d6",
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: "rgba(169, 177, 214, 0.1)",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#a9b1d6",
        },
        grid: {
          color: "rgba(169, 177, 214, 0.1)",
        },
      },
    },
  };

  // Historical CPU Chart
  const historicalCPUCtx = document
    .getElementById("historicalCPUChart")
    .getContext("2d");
  historicalCPUChart = new Chart(historicalCPUCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Average CPU Load",
          data: [],
          borderColor: "#7aa2f7",
          backgroundColor: "rgba(122, 162, 247, 0.1)",
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
        },
      ],
    },
    options: {
      ...historicalChartOptions,
      scales: {
        ...historicalChartOptions.scales,
        y: {
          ...historicalChartOptions.scales.y,
          suggestedMax: 100,
          title: {
            display: true,
            text: "CPU Load (%)",
            color: "#a9b1d6",
          },
        },
      },
    },
  });

  // Historical RAM Chart
  const historicalRAMCtx = document
    .getElementById("historicalRAMChart")
    .getContext("2d");
  historicalRAMChart = new Chart(historicalRAMCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "RAM Usage",
          data: [],
          borderColor: "#bb9af7",
          backgroundColor: "rgba(187, 154, 247, 0.1)",
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
        },
      ],
    },
    options: {
      ...historicalChartOptions,
      scales: {
        ...historicalChartOptions.scales,
        y: {
          ...historicalChartOptions.scales.y,
          suggestedMax: 100,
          title: {
            display: true,
            text: "RAM Usage (%)",
            color: "#a9b1d6",
          },
        },
      },
    },
  });
}

function updateStats(data) {
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
}

function updateEmailList(datasites) {
  const emailList = document.getElementById("emailList");
  emailList.innerHTML = "";
  datasites.forEach((email) => {
    const div = document.createElement("div");
    div.className = "email";
    div.textContent = email;
    emailList.appendChild(div);
  });
}

function updateCharts(data) {
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

  // Update historical charts
  if (data.historical_data && data.historical_data.length > 0) {
    // Sort historical data by timestamp
    const sortedData = [...data.historical_data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Update CPU history chart
    historicalCPUChart.data.labels = sortedData.map(
      (d) => new Date(d.timestamp)
    );
    historicalCPUChart.data.datasets[0].data = sortedData.map(
      (d) => d.cpu_load_avg
    );
    historicalCPUChart.update();

    // Update RAM history chart
    historicalRAMChart.data.labels = sortedData.map(
      (d) => new Date(d.timestamp)
    );
    historicalRAMChart.data.datasets[0].data = sortedData.map(
      (d) => d.ram_usage_percent
    );
    historicalRAMChart.update();
  }
}

async function loadDashboardData() {
  try {
    showStatus("Updating dashboard...");
    const response = await fetch("./dashboard_metrics.json");
    const data = await response.json();

    // Validate historical data exists
    if (!data.historical_data || !Array.isArray(data.historical_data)) {
      console.warn("No historical data found in response");
      data.historical_data = [];
    }

    // Create systems array from datasites for current metrics
    systems = data.datasites.map((email) => ({
      email: email,
      cpu_load_1min: data.cpu_load.average,
      cpu_load_5min: data.cpu_load.average,
      cpu_load_15min: data.cpu_load.average,
      total_ram: data.ram.total / data.total_systems,
      used_ram: data.ram.used / data.total_systems,
    }));

    // Log data for debugging
    console.log("Historical data points:", data.historical_data.length);
    console.log("First historical point:", data.historical_data[0]);
    console.log(
      "Last historical point:",
      data.historical_data[data.historical_data.length - 1]
    );

    // Update all charts and stats
    updateCharts(data);
    updateStats(data);
    updateEmailList(data.datasites);

    document.getElementById("lastUpdate").textContent =
      new Date().toLocaleString();
    showStatus("Dashboard updated successfully");
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showStatus("Error updating dashboard");
  }
}

// Initialize charts when the page loads
document.addEventListener("DOMContentLoaded", () => {
  initializeCharts();
  loadDashboardData();
  // Refresh data every minute
  setInterval(loadDashboardData, 60000);
});
