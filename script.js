const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const statusEl = document.getElementById("status");
const statsPanel = document.getElementById("statsPanel");
const totalPrincipalEl = document.getElementById("totalPrincipal");
const totalInterestEl = document.getElementById("totalInterest");
const totalPaidEl = document.getElementById("totalPaid");
const chartCanvas = document.getElementById("loanChart");

let chart = null;

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

function updateStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#8b1e1e" : "";
}

function parseAmount(raw) {
  const normalized = raw.replace(/[$,]/g, "").trim();
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : NaN;
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const csvMatch = trimmed.match(/^([^,\t]+)[,\t]+([^,\t]+)[,\t]+([^,\t]+)$/);
  let parts;
  if (csvMatch) {
    parts = [csvMatch[1], csvMatch[2], csvMatch[3]];
  } else {
    parts = trimmed.split(/\s+/);
    if (parts.length < 3) {
      return { error: `Invalid line format: ${line}` };
    }
    parts = [parts[0], parts[1], parts[2]];
  }

  const date = parts[0].trim();
  const principal = parseAmount(parts[1]);
  const interest = parseAmount(parts[2]);

  if (!date || Number.isNaN(principal) || Number.isNaN(interest)) {
    return { error: `Invalid values in line: ${line}` };
  }

  const dateAsNumber = Date.parse(date);
  return {
    date,
    principal,
    interest,
    dateAsNumber: Number.isNaN(dateAsNumber) ? Number.MAX_SAFE_INTEGER : dateAsNumber,
  };
}

function parseContent(content) {
  const rows = [];
  const errors = [];

  content.split(/\r?\n/).forEach((line, idx) => {
    const parsed = parseLine(line);
    if (!parsed) {
      return;
    }
    if (parsed.error) {
      errors.push(`Line ${idx + 1}: ${parsed.error}`);
      return;
    }
    rows.push(parsed);
  });

  rows.sort((a, b) => a.dateAsNumber - b.dateAsNumber);
  return { rows, errors };
}

function buildPrefixSums(values) {
  const sums = [];
  let running = 0;
  values.forEach((v) => {
    running += v;
    sums.push(running);
  });
  return sums;
}

function renderChart(rows) {
  const labels = rows.map((r) => r.date);
  const principalValues = rows.map((r) => r.principal);
  const interestValues = rows.map((r) => r.interest);
  const principalPrefix = buildPrefixSums(principalValues);
  const interestPrefix = buildPrefixSums(interestValues);

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Principal",
          data: principalValues,
          borderColor: "#14766c",
          backgroundColor: "rgba(20, 118, 108, 0.4)",
          tension: 0.22,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          stacked: true,
        },
        {
          label: "Interest",
          data: interestValues,
          borderColor: "#d25a2f",
          backgroundColor: "rgba(210, 90, 47, 0.4)",
          tension: 0.22,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          stacked: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            font: {
              family: "Space Grotesk",
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const datasetLabel = context.dataset.label || "";
              const value = currencyFormatter.format(context.parsed.y);
              // For stacked charts, context.parsed.y is the individual value, 
              // but we want to show the user it's the component of the total.
              return `${datasetLabel}: ${value}`;
            },
            footer(tooltipItems) {
              if (!tooltipItems.length) {
                return "";
              }
              const index = tooltipItems[0].dataIndex;
              const monthlyTotal = principalValues[index] + interestValues[index];
              return [
                `Monthly Total: ${currencyFormatter.format(monthlyTotal)}`,
                "------------------",
                `Cumulative Principal: ${currencyFormatter.format(principalPrefix[index])}`,
                `Cumulative Interest: ${currencyFormatter.format(interestPrefix[index])}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            color: "#2e3f45",
            font: {
              family: "IBM Plex Mono",
            },
          },
          grid: {
            color: "rgba(46, 63, 69, 0.08)",
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback(value) {
              return currencyFormatter.format(value);
            },
            color: "#2e3f45",
          },
          grid: {
            color: "rgba(46, 63, 69, 0.08)",
          },
        },
      },
    },
  });

  const totalPrincipal = principalPrefix[principalPrefix.length - 1] || 0;
  const totalInterest = interestPrefix[interestPrefix.length - 1] || 0;
  totalPrincipalEl.textContent = currencyFormatter.format(totalPrincipal);
  totalInterestEl.textContent = currencyFormatter.format(totalInterest);
  totalPaidEl.textContent = currencyFormatter.format(totalPrincipal + totalInterest);
  statsPanel.hidden = false;
}

function processText(content) {
  const { rows, errors } = parseContent(content);

  if (!rows.length) {
    updateStatus("No valid payment rows found. Please check file format.", true);
    statsPanel.hidden = true;
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }

  renderChart(rows);
  if (errors.length) {
    updateStatus(`Loaded ${rows.length} rows with ${errors.length} skipped invalid lines.`);
  } else {
    updateStatus(`Loaded ${rows.length} rows successfully.`);
  }
}

function handleFile(file) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => processText(String(reader.result || ""));
  reader.onerror = () => updateStatus("Failed to read the file.", true);
  reader.readAsText(file);
}

fileInput.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  handleFile(target.files && target.files[0]);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  const file = event.dataTransfer && event.dataTransfer.files[0];
  handleFile(file);
});
