import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const MeetReportViewer = () => {
  const [reuniones, setReuniones] = useState([]);
  const [materiasMap, setMateriasMap] = useState({});

  // Cargar materias desde /public/materias.csv
  useEffect(() => {
    fetch("/archivo/materias.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        }).data;
        const map = {};
        parsed.forEach((row) => {
          const url = row["Código de reunión"];
          const code = url
            ?.split("/")
            .pop()
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase();
          if (code) {
            map[code] = {
              codigoMateria: row["Código de materia"],
              materia: row["Materia"],
            };
          }
        });
        setMateriasMap(map);
      });
  }, []);

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => processDatos(data),
    });
  };

  const processDatos = (data) => {
    const grupos = {};
    data.forEach((row) => {
      const idConferencia = row["ID de conferencia"];
      const codigoRaw = row["Código de reunión"]
        ?.replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
      const inicioStr = row["Hora de inicio"];
      const durSec = parseInt(row["Duración (segundos)"], 10) || 0;
      if (!idConferencia || !codigoRaw || !materiasMap[codigoRaw] || !inicioStr)
        return;

      const inicio = new Date(inicioStr);
      const fin = new Date(inicio.getTime() + durSec * 1000);

      if (!grupos[idConferencia]) {
        grupos[idConferencia] = {
          codigoReunion: codigoRaw,
          inicioMin: inicio,
          finMax: fin,
          participantes: new Set(),
        };
      } else {
        if (inicio < grupos[idConferencia].inicioMin)
          grupos[idConferencia].inicioMin = inicio;
        if (fin > grupos[idConferencia].finMax)
          grupos[idConferencia].finMax = fin;
      }
      grupos[idConferencia].participantes.add(row["Nombre del actor"]);
    });

    const resultado = Object.entries(grupos).map(([id, g]) => {
      const durMs = g.finMax - g.inicioMin;
      const durMin = Math.round(durMs / 60000);
      const horas = Math.floor(durMin / 60);
      const mins = durMin % 60;
      const code = g.codigoReunion;
      const link = `https://meet.google.com/${code.slice(0, 3)}-${code.slice(
        3,
        7
      )}-${code.slice(7)}`;
      const mat = materiasMap[code] || {};
      return {
        idConferencia: id,
        codigoMateria: mat.codigoMateria,
        materia: mat.materia,
        link,
        inicio: g.inicioMin.toLocaleString("es-AR"),
        fin: g.finMax.toLocaleString("es-AR"),
        duracion: `${horas}h ${mins}m`,
        participantes: g.participantes.size,
      };
    });

    // Ordenar por código de materia, luego por fecha de inicio
    const ordenado = resultado.sort((a, b) => {
      if (a.codigoMateria < b.codigoMateria) return -1;
      if (a.codigoMateria > b.codigoMateria) return 1;
      const dateA = new Date(a.inicio);
      const dateB = new Date(b.inicio);
      return dateA - dateB;
    });
    setReuniones(ordenado);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Meet Report");
    sheet.columns = [
      { header: "Código materia", key: "codigoMateria", width: 15 },
      { header: "Materia", key: "materia", width: 20 },
      { header: "Reunión", key: "link", width: 30 },
      { header: "Inicio", key: "inicio", width: 25 },
      { header: "Fin", key: "fin", width: 25 },
      { header: "Duración", key: "duracion", width: 15 },
      { header: "Participantes", key: "participantes", width: 15 },
    ];
    // Usar reuniones en lugar de una variable no definida
    reuniones.forEach((row) => sheet.addRow(row));
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      "meet_report.xlsx"
    );
  };

  return (
    <div className="container mt-4">
      <h2>Reporte de Reuniones de Meet</h2>

      <div className="row mb-3 mt-3">
        <div className="col-md-6">
          <input
            type="file"
            accept=".csv"
            className="form-control"
            onChange={handleCSVUpload}
          />
        </div>
      </div>

      {reuniones.length > 0 && (
        <>
          <div className="mb-3">
            <button className="btn btn-success" onClick={exportToExcel}>
              Exportar a Excel
            </button>
          </div>

          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Código materia</th>
                <th>Materia</th>
                <th>Reunión</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Duración</th>
                <th>Participantes</th>
              </tr>
            </thead>
            <tbody>
              {reuniones.map((r, i) => (
                <tr key={i}>
                  <td>{r.codigoMateria}</td>
                  <td>{r.materia}</td>
                  <td>
                    <a href={r.link} target="_blank" rel="noreferrer">
                      Abrir
                    </a>
                  </td>
                  <td>{r.inicio}</td>
                  <td>{r.fin}</td>
                  <td>{r.duracion}</td>
                  <td>{r.participantes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default MeetReportViewer;
