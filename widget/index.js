let cpuChart,
  memoryChart,
  historicalCPUChart,
  historicalRAMChart,
  hourCPUChart,
  hourRAMChart;
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

  // Common options for time-series charts
  const commonOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(30, 32, 47, 0.9)",
        titleColor: "#a9b1d6",
        bodyColor: "#a9b1d6",
        borderColor: "#7aa2f7",
        borderWidth: 1,
        padding: 12,
        bodyFont: {
          family: "Roboto",
          size: 13,
        },
        titleFont: {
          family: "Roboto",
          size: 14,
          weight: "bold",
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "hour",
          displayFormats: {
            hour: "HH:mm",
          },
        },
        grid: {
          display: true,
          color: "rgba(169, 177, 214, 0.1)",
          drawBorder: false,
        },
        ticks: {
          color: "#a9b1d6",
          font: {
            family: "Roboto",
            size: 11,
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          display: true,
          color: "rgba(169, 177, 214, 0.1)",
          drawBorder: false,
        },
        ticks: {
          color: "#a9b1d6",
          font: {
            family: "Roboto",
            size: 11,
          },
          padding: 8,
          maxTicksLimit: 6,
        },
      },
    },
    elements: {
      line: {
        tension: 0.3,
        borderWidth: 3,
      },
      point: {
        radius: 0,
        hoverRadius: 5,
        hitRadius: 30,
        hoverBorderWidth: 2,
      },
    },
  };

  // Initialize the charts with common options
  const charts = [
    {
      id: "historicalCPUChart",
      color: "#7aa2f7",
      label: "CPU Load Average",
      chart: historicalCPUChart,
    },
    {
      id: "historicalRAMChart",
      color: "#bb9af7",
      label: "RAM Usage",
      chart: historicalRAMChart,
    },
    {
      id: "hourCPUChart",
      color: "#f7768e",
      label: "CPU Load Average (1h)",
      chart: hourCPUChart,
    },
    {
      id: "hourRAMChart",
      color: "#9ece6a",
      label: "RAM Usage (1h)",
      chart: hourRAMChart,
    },
  ];

  charts.forEach(({ id, color, label }) => {
    const ctx = document.getElementById(id).getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label,
            data: [],
            borderColor: color,
            backgroundColor: color
              .replace(")", ", 0.2)")
              .replace("rgb", "rgba"),
            fill: true,
            cubicInterpolationMode: "monotone",
          },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          x: {
            ...commonOptions.scales.x,
            time: {
              unit: id.includes("hour") ? "minute" : "hour",
              displayFormats: {
                minute: "HH:mm",
                hour: "HH:mm",
              },
            },
          },
          y: {
            ...commonOptions.scales.y,
            beginAtZero: true,
            title: {
              display: true,
              text: label.includes("RAM") ? "RAM Usage (%)" : "Load Average",
              color: "#a9b1d6",
              font: {
                size: 13,
                family: "Roboto",
              },
              padding: { bottom: 10 },
            },
          },
        },
      },
    });

    // Assign the chart to the corresponding variable
    if (id === "historicalCPUChart") historicalCPUChart = chart;
    else if (id === "historicalRAMChart") historicalRAMChart = chart;
    else if (id === "hourCPUChart") hourCPUChart = chart;
    else if (id === "hourRAMChart") hourRAMChart = chart;
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

  if (data.historical_data && data.historical_data.length > 0) {
    // Sort historical data by timestamp
    const sortedData = [...data.historical_data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Filter last hour of data
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourData = sortedData.filter(
      (d) => new Date(d.timestamp) >= oneHourAgo
    );

    // Update time series charts
    const chartUpdates = [
      {
        chart: historicalCPUChart,
        data: sortedData,
        valueKey: "cpu_load_avg",
      },
      {
        chart: historicalRAMChart,
        data: sortedData,
        valueKey: "ram_usage_percent",
      },
      {
        chart: hourCPUChart,
        data: hourData,
        valueKey: "cpu_load_avg",
      },
      {
        chart: hourRAMChart,
        data: hourData,
        valueKey: "ram_usage_percent",
      },
    ];

    // Update all charts
    chartUpdates.forEach(({ chart, data, valueKey }) => {
      chart.data.labels = data.map((d) => new Date(d.timestamp));
      chart.data.datasets[0].data = data.map((d) => d[valueKey]);
      chart.update();
    });
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
    if (data.historical_data.length > 0) {
      console.log("First historical point:", data.historical_data[0]);
      console.log(
        "Last historical point:",
        data.historical_data[data.historical_data.length - 1]
      );
    }

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
