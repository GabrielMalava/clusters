class ClusteringSystem {
  constructor() {
    this.clusters = [];
    this.nextElementId = 1;
    this.distanceThreshold = 2.0;
    this.kDistantElements = 2;
    this.categoricalMappings = new Map();
    this.nextCategoryValue = 1;

    this.initializeClusters();
    this.log("Sistema inicializado com 2 clusters vazios", "info");
  }

  initializeClusters() {
    this.clusters = [new Cluster(0), new Cluster(1)];
  }

  addElement(data, isNumeric = true, originalData = null) {
    const element = new Element(
      this.nextElementId++,
      data,
      isNumeric,
      originalData
    );

    if (this.clusters.every((cluster) => cluster.elements.length === 0)) {
      this.clusters[0].addElement(element);
      this.log(
        `Elemento ${element.id} adicionado ao primeiro cluster`,
        "success"
      );
    } else if (
      this.clusters.filter((cluster) => cluster.elements.length > 0).length ===
      1
    ) {
      const emptyCluster = this.clusters.find(
        (cluster) => cluster.elements.length === 0
      );
      emptyCluster.addElement(element);
      this.log(
        `Elemento ${element.id} adicionado ao segundo cluster`,
        "success"
      );
    } else {
      let minDistance = Infinity;
      let targetCluster = null;

      for (const cluster of this.clusters) {
        if (cluster.elements.length > 0) {
          const distance = this.calculateDistance(
            element.data,
            cluster.getCentroid()
          );
          if (distance < minDistance) {
            minDistance = distance;
            targetCluster = cluster;
          }
        }
      }

      targetCluster.addElement(element);
      this.log(
        `Elemento ${element.id} atribuído ao cluster ${
          targetCluster.id
        } (distância: ${minDistance.toFixed(2)})`,
        "success"
      );
    }

    this.updateDisplay();
    this.checkForReorganization();
  }

  calculateDistance(point1, point2) {
    if (point1.length !== point2.length) {
      throw new Error("Pontos devem ter a mesma dimensionalidade");
    }

    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
      sum += Math.pow(point1[i] - point2[i], 2);
    }
    return Math.sqrt(sum);
  }

  recalculateAllCentroids() {
    for (const cluster of this.clusters) {
      if (cluster.elements.length > 0) {
        cluster.updateCentroid();
      }
    }
    this.log("Centróides recalculados para todos os clusters", "info");
  }

  checkForReorganization() {
    const distantElements = this.findDistantElements();

    if (distantElements.length >= this.kDistantElements) {
      this.createNewCluster(distantElements);
    }
  }

  findDistantElements() {
    const distantElements = [];

    for (const cluster of this.clusters) {
      if (cluster.elements.length <= 1) continue;

      const centroid = cluster.getCentroid();
      const elementsWithDistance = cluster.elements.map((element) => ({
        element,
        cluster,
        distance: this.calculateDistance(element.data, centroid),
      }));

      const distant = elementsWithDistance
        .filter((item) => item.distance > this.distanceThreshold)
        .sort((a, b) => b.distance - a.distance);

      distantElements.push(...distant);
    }

    return distantElements.slice(0, this.kDistantElements);
  }

  createNewCluster(distantElements) {
    if (distantElements.length === 0) return;

    const newCluster = new Cluster(this.clusters.length);

    for (const item of distantElements) {
      item.cluster.removeElement(item.element);
      newCluster.addElement(item.element);
    }

    this.clusters.push(newCluster);
    this.log(
      `Novo cluster ${newCluster.id} criado com ${distantElements.length} elementos distantes`,
      "warning"
    );

    this.recalculateAllCentroids();
    this.updateDisplay();
  }

  reorganizeClusters() {
    let changes = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changes && iterations < maxIterations) {
      changes = false;
      iterations++;

      for (const cluster of this.clusters) {
        const elementsToMove = [];

        for (const element of [...cluster.elements]) {
          let minDistance = Infinity;
          let targetCluster = cluster;

          for (const otherCluster of this.clusters) {
            if (otherCluster.elements.length === 0) continue;

            const distance = this.calculateDistance(
              element.data,
              otherCluster.getCentroid()
            );
            if (distance < minDistance) {
              minDistance = distance;
              targetCluster = otherCluster;
            }
          }

          if (targetCluster !== cluster) {
            elementsToMove.push({ element, targetCluster });
            changes = true;
          }
        }

        for (const move of elementsToMove) {
          cluster.removeElement(move.element);
          move.targetCluster.addElement(move.element);
        }
      }

      this.recalculateAllCentroids();
    }

    this.log(`Reorganização concluída em ${iterations} iterações`, "success");
    this.updateDisplay();
  }

  convertCategoricalToNumeric(categoricalData) {
    const numericData = [];

    for (const category of categoricalData) {
      if (!this.categoricalMappings.has(category)) {
        this.categoricalMappings.set(category, this.nextCategoryValue++);
      }
      numericData.push(this.categoricalMappings.get(category));
    }

    return numericData;
  }

  prepareForKNN() {
    const knnData = [];

    for (const cluster of this.clusters) {
      for (const element of cluster.elements) {
        knnData.push({
          id: element.id,
          features: element.data,
          cluster: cluster.id,
          isNumeric: element.isNumeric,
          originalData: element.originalData,
        });
      }
    }

    this.log(
      `Dados preparados para KNN: ${knnData.length} elementos`,
      "success"
    );
    console.log("Dados KNN:", knnData);
    console.log(
      "Mapeamentos categóricos:",
      Object.fromEntries(this.categoricalMappings)
    );

    return {
      data: knnData,
      categoricalMappings: Object.fromEntries(this.categoricalMappings),
    };
  }

  updateDisplay() {
    this.displayClusters();
    this.updateStatistics();
  }

  displayClusters() {
    const container = document.getElementById("clustersContainer");
    container.innerHTML = "";

    for (const cluster of this.clusters) {
      if (cluster.elements.length === 0) continue;

      const clusterDiv = document.createElement("div");
      clusterDiv.className = `cluster cluster-${cluster.id % 5}`;

      const centroid = cluster.getCentroid();
      clusterDiv.innerHTML = `
                        <h3>Cluster ${cluster.id} (${
        cluster.elements.length
      } elementos)</h3>
                        <p><strong>Centróide:</strong> [${centroid
                          .map((v) => v.toFixed(2))
                          .join(", ")}]</p>
                        <div class="elements">
                            ${cluster.elements
                              .map(
                                (element) =>
                                  `<span class="element ${
                                    element.isCentroid ? "centroid" : ""
                                  }">
                                    ${element.id}: [${element.data
                                    .map((v) => v.toFixed(2))
                                    .join(", ")}]
                                    ${
                                      element.originalData
                                        ? `<br><small>Original: ${element.originalData.join(
                                            ", "
                                          )}</small>`
                                        : ""
                                    }
                                </span>`
                              )
                              .join("")}
                        </div>
                    `;

      container.appendChild(clusterDiv);
    }
  }

  updateStatistics() {
    const totalElements = this.clusters.reduce(
      (sum, cluster) => sum + cluster.elements.length,
      0
    );
    const activeClusters = this.clusters.filter(
      (cluster) => cluster.elements.length > 0
    ).length;

    let totalDistance = 0;
    let distanceCount = 0;

    for (const cluster of this.clusters) {
      if (cluster.elements.length > 0) {
        const centroid = cluster.getCentroid();
        for (const element of cluster.elements) {
          totalDistance += this.calculateDistance(element.data, centroid);
          distanceCount++;
        }
      }
    }

    const avgDistance = distanceCount > 0 ? totalDistance / distanceCount : 0;

    document.getElementById("totalElements").textContent = totalElements;
    document.getElementById("totalClusters").textContent = activeClusters;
    document.getElementById("avgDistance").textContent = avgDistance.toFixed(2);
  }

  log(message, type = "info") {
    const logContainer = document.getElementById("operationLog");
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  clearAll() {
    this.clusters = [];
    this.nextElementId = 1;
    this.categoricalMappings.clear();
    this.nextCategoryValue = 1;
    this.initializeClusters();
    this.updateDisplay();
    document.getElementById("operationLog").innerHTML = "";
    this.log("Sistema resetado", "info");
  }
}

class Cluster {
  constructor(id) {
    this.id = id;
    this.elements = [];
    this.centroid = null;
  }

  addElement(element) {
    this.elements.push(element);
    this.updateCentroid();
  }

  removeElement(element) {
    const index = this.elements.findIndex((e) => e.id === element.id);
    if (index !== -1) {
      this.elements.splice(index, 1);
      this.updateCentroid();
      return true;
    }
    return false;
  }

  updateCentroid() {
    if (this.elements.length === 0) {
      this.centroid = null;
      return;
    }

    const dimensions = this.elements[0].data.length;
    const newCentroid = new Array(dimensions).fill(0);

    for (const element of this.elements) {
      for (let i = 0; i < dimensions; i++) {
        newCentroid[i] += element.data[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      newCentroid[i] /= this.elements.length;
    }

    this.centroid = newCentroid;

    this.updateCentroidMarker();
  }

  updateCentroidMarker() {
    for (const element of this.elements) {
      element.isCentroid = false;
    }

    if (this.elements.length === 0 || !this.centroid) return;

    let minDistance = Infinity;
    let closestElement = null;

    for (const element of this.elements) {
      const distance = this.calculateDistance(element.data, this.centroid);
      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    }

    if (closestElement) {
      closestElement.isCentroid = true;
    }
  }

  getCentroid() {
    return this.centroid || [];
  }

  calculateDistance(point1, point2) {
    if (point1.length !== point2.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
      sum += Math.pow(point1[i] - point2[i], 2);
    }
    return Math.sqrt(sum);
  }
}

class Element {
  constructor(id, data, isNumeric = true, originalData = null) {
    this.id = id;
    this.data = [...data];
    this.isNumeric = isNumeric;
    this.originalData = originalData ? [...originalData] : null;
    this.isCentroid = false;
  }
}

const clusteringSystem = new ClusteringSystem();

function addNumericElement() {
  const input = document.getElementById("numericInput");
  const values = input.value
    .split(",")
    .map((v) => parseFloat(v.trim()))
    .filter((v) => !isNaN(v));

  if (values.length === 0) {
    alert("Por favor, insira valores numéricos válidos separados por vírgula");
    return;
  }

  clusteringSystem.addElement(values, true);
  input.value = "";
}

function addCategoricalElement() {
  const input = document.getElementById("categoricalInput");
  const values = input.value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  if (values.length === 0) {
    alert(
      "Por favor, insira valores categóricos válidos separados por vírgula"
    );
    return;
  }

  const numericValues = clusteringSystem.convertCategoricalToNumeric(values);
  clusteringSystem.addElement(numericValues, false, values);
  input.value = "";
}

function updateThreshold() {
  const threshold = parseFloat(document.getElementById("thresholdInput").value);
  if (threshold > 0) {
    clusteringSystem.distanceThreshold = threshold;
    clusteringSystem.log(`Limiar atualizado para ${threshold}`, "info");
  }
}

function updateK() {
  const k = parseInt(document.getElementById("kInput").value);
  if (k > 0) {
    clusteringSystem.kDistantElements = k;
    clusteringSystem.log(
      `Número de elementos distantes atualizado para ${k}`,
      "info"
    );
  }
}

function reorganizeClusters() {
  clusteringSystem.reorganizeClusters();
}

function clearAll() {
  if (confirm("Tem certeza que deseja limpar todos os dados?")) {
    clusteringSystem.clearAll();
  }
}

function prepareForKNN() {
  const knnData = clusteringSystem.prepareForKNN();
  alert(
    `Dados preparados para KNN! Verifique o console para detalhes.\nTotal de elementos: ${
      knnData.data.length
    }\nMapeamentos categóricos: ${
      Object.keys(knnData.categoricalMappings).length
    }`
  );
}

clusteringSystem.updateDisplay();
