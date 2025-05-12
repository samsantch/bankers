// bankers.js
const toolCount = 6;
const toolNames = ["Drills", "Hammers", "Saws", "Ladders", "Screwdrivers", "Power"];
let crews = [
  {
    name: "Crew A",
    max: [2, 1, 1, 1, 1, 1],
    allocated: [0, 0, 0, 0, 0, 0]
  },
  {
    name: "Crew B",
    max: [1, 1, 1, 1, 1, 1],
    allocated: [0, 0, 0, 0, 0, 0]
  }
];

let available = [5, 5, 3, 4, 2, 2];

function calculateNeed(crew) {
  return crew.max.map((m, i) => m - crew.allocated[i]);
}

function canComplete(crew, work) {
  const need = calculateNeed(crew);
  return need.every((n, i) => n <= work[i]);
}

function showMessage(message, isError = false) {
  const messageBox = document.getElementById("messageBox");
  messageBox.textContent = message;
  messageBox.className = isError ? "message-box error" : "message-box success";
  setTimeout(() => messageBox.style.display = "none", 5000);
}

function updateStatus() {
  const safetyStatus = document.getElementById("safetyStatus");
  const availableTools = document.getElementById("availableTools");
  
  const isSafe = isSafeState();
  safetyStatus.innerHTML = `System Status: <span class="${isSafe ? 'safe' : 'unsafe'}">${isSafe ? 'SAFE' : 'UNSAFE'}</span>`;
  
  availableTools.innerHTML = `Available Tools: ${toolNames.map((name, i) => `${name}: ${available[i]}`).join(", ")}`;
}

function validateRequest(toolId) {
  const requested = parseInt(document.getElementById(toolId).value);
  const availableTools = available[toolNames.indexOf(toolId)];
  const warningElement = document.getElementById(`${toolId}-warning`);

  // Clear previous warnings
  warningElement.textContent = '';
  warningElement.style.display = 'none';

  // Check for negative/NAN first
  if (isNaN(requested) || requested < 0) {
    showMessage("Error: Please enter valid positive numbers!", true);
    return false;
  }

  // Then check availability
  if (requested > availableTools) {
    warningElement.textContent = `Only ${availableTools} available!`;
    warningElement.style.display = 'inline';
    return false;
  }

  return true;
}

function render() {
  const tbody = document.querySelector("#crewTable tbody");
  tbody.innerHTML = "";

  // Create a copy of available for simulation
  const work = [...available];
  
  crews.forEach((crew, index) => {
    const need = calculateNeed(crew);
    const canCompleteNow = canComplete(crew, work);
    const hasInvalidNeed = need.some(n => n < 0);
    
    const row = document.createElement("tr");
    if (hasInvalidNeed) row.classList.add("invalid-need");
    
    row.innerHTML = `
      <td>${crew.name}</td>
      <td>${crew.max.join(", ")}</td>
      <td>${crew.allocated.join(", ")}</td>
      <td>${need.join(", ")}</td>
      <td class="${canCompleteNow ? 'can-complete' : 'cannot-complete'}">
        ${canCompleteNow ? 'Yes' : 'No'}
      </td>
      <td>
        <button onclick="archiveCrew(${index})">Archive</button>
        <button onclick="showReleaseDialog(${index})">Release</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  const crewSelect = document.getElementById("crewSelect");
  crewSelect.innerHTML = crews.map((c, i) => `<option value="${i}">${c.name}</option>`).join("");
  
  updateStatus();
}

function addCrew() {
  const name = document.getElementById("newCrewName").value.trim();
  if (!name) {
    showMessage("Please enter a crew name", true);
    return;
  }
  
  if (crews.some(c => c.name === name)) {
    showMessage("Crew with this name already exists", true);
    return;
  }
  
  crews.push({
    name,
    max: Array(toolCount).fill(1),
    allocated: Array(toolCount).fill(0)
  });
  
  document.getElementById("newCrewName").value = "";
  showMessage(`Crew ${name} added successfully`);
  render();
}

function archiveCrew(index) {
  const crew = crews[index];
  
  // Return all allocated resources to available pool
  for (let i = 0; i < toolCount; i++) {
    available[i] += crew.allocated[i];
  }
  
  crews.splice(index, 1);
  showMessage(`Crew ${crew.name} archived and resources released`);
  render();
}

function showReleaseDialog(crewIndex) {
  const crew = crews[crewIndex];
  const inputs = ["drills", "hammers", "saws", "ladders", "screwdrivers", "power"];
  
  // Set current allocated values in the request form
  inputs.forEach((id, i) => {
    document.getElementById(id).value = crew.allocated[i];
  });
  
  // Set the crew select to this crew
  document.getElementById("crewSelect").value = crewIndex;
}

function releaseTools() {
  // 1. Get the selected crew
  const crewIndex = parseInt(document.getElementById("crewSelect").value);
  const crew = crews[crewIndex];
  
  // 2. Get release amounts from input fields
  const releaseAmounts = [
    parseInt(document.getElementById("drills").value),
    parseInt(document.getElementById("hammers").value),
    parseInt(document.getElementById("saws").value),
    parseInt(document.getElementById("ladders").value),
    parseInt(document.getElementById("screwdrivers").value),
    parseInt(document.getElementById("power").value)
  ];

  // 3. Validate release amounts
  for (let i = 0; i < toolCount; i++) {
    if (isNaN(releaseAmounts[i]) || releaseAmounts[i] < 0) {
      showMessage(`Error: Invalid value for ${toolNames[i]}!`, true);
      return;
    }
    if (releaseAmounts[i] > crew.allocated[i]) {
      showMessage(`Cannot release more ${toolNames[i]} than allocated (max: ${crew.allocated[i]})!`, true);
      return;
    }
  }

  // 4. Perform the release
  for (let i = 0; i < toolCount; i++) {
    crew.allocated[i] -= releaseAmounts[i];
    available[i] += releaseAmounts[i];
  }

  showMessage(`Released tools from ${crew.name} successfully!`);
  render(); // Update the UI
}

function checkPendingRequests() {
  pendingRequests = pendingRequests.filter(req => {
    const canFulfill = toolNames.every((tool, i) => 
      req.request[i] <= available[i]
    );

    if (canFulfill) {
      // Auto-approve if tools are now available
      approveRequest(req.crewIndex, req.request);
      return false; // Remove from queue
    }
    return true; // Keep in queue
  });
}

function safeAllocate(crew, request) {
  // Check if allocation would make any available count negative
  for (let i = 0; i < toolCount; i++) {
    if (available[i] - request[i] < 0) {
      return false;
    }
  }
  
  // Only proceed if safe
  for (let i = 0; i < toolCount; i++) {
    available[i] -= request[i];
    crew.allocated[i] += request[i];
  }
  return true;
}

function validateInputs(request) {
  // Check for negative values
  if (request.some(val => val < 0)) {
    showMessage("Error: Cannot use negative numbers!", true);
    return false;
  }
  
  // Check if any input is NaN (happens if field is empty)
  if (request.some(isNaN)) {
    showMessage("Error: Please enter valid numbers in all fields!", true);
    return false;
  }
  
  return true;
}

function resetToolInputs() {
  ["drills", "hammers", "saws", "ladders", "screwdrivers", "power"].forEach(id => {
    document.getElementById(id).value = "0";
  });
}

let pendingRequests = [];

function requestTools() {
  // 1. Get selected crew and request values
  const crewIndex = parseInt(document.getElementById("crewSelect").value);
  const crew = crews[crewIndex];
  const request = [
    parseInt(document.getElementById("drills").value) || 0,
    parseInt(document.getElementById("hammers").value) || 0,
    parseInt(document.getElementById("saws").value) || 0,
    parseInt(document.getElementById("ladders").value) || 0,
    parseInt(document.getElementById("screwdrivers").value) || 0,
    parseInt(document.getElementById("power").value) || 0
  ];

  // 2. Validate request
  if (!validateInputs(request)) return;
  
  const need = calculateNeed(crew);
  for (let i = 0; i < toolCount; i++) {
    if (request[i] > need[i]) {
      showMessage(`Error: Request exceeds Need for ${toolNames[i]}!`, true);
      return;
    }
  }

  // 3. Check if resources are available
  if (!isLessThanOrEqual(request, available)) {
    showMessage("Not enough available tools", true);
    return;
  }
  
  // 4. Temporarily allocate resources
  for (let i = 0; i < toolCount; i++) {
    available[i] -= request[i];
    crew.allocated[i] += request[i];
  }
  
  // 5. Check if state remains safe
  if (isSafeState()) {
    showMessage("Request granted - system remains in safe state");
  } else {
    // Roll back allocation
    for (let i = 0; i < toolCount; i++) {
      available[i] += request[i];
      crew.allocated[i] -= request[i];
    }
    showMessage("Request denied - would lead to unsafe state", true);
    return;
  }
  
  // 6. Reset inputs and update UI
  resetToolInputs();
  render();
}

function isLessThanOrEqual(a, b) {
  return a.every((val, i) => val <= b[i]);
}

function isSafeState() {
  const work = [...available];
  const finish = crews.map(() => false);
  let found;

  do {
    found = false;
    for (let i = 0; i < crews.length; i++) {
      if (!finish[i] && canComplete(crews[i], work)) {
        // This crew can complete - release its resources
        for (let j = 0; j < toolCount; j++) {
          work[j] += crews[i].allocated[j];
        }
        finish[i] = true;
        found = true;
      }
    }
  } while (found);
  
  return finish.every(f => f);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  render();
});