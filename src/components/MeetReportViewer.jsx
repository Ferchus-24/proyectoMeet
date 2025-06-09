import React, { useState, useEffect } from "react";
import Papa from "papaparse";

const MeetReportViewer = () => {
  const [reuniones, setReuniones] = useState([]);
  const [materiasMap, setMateriasMap] = useState({});

  // Cargar materias desde /public/materias.csv
  useEffect(() => {
    fetch("/materias.csv")
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
              // No se guarda el profesor porque no se usa
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
      complete: ({ data }) => procesarDatos(data),
    });
  };

  const procesarDatos = (data) => {
    const grupos = {};

    data.forEach((row) => {
      const idConferencia = row["ID de conferencia"];
      const codigoReunion = row["Código de reunión"]
        ?.replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
      const inicioStr = row["Hora de inicio"];
      const duracion = parseInt(row["Duración (segundos)"], 10) || 0;
      const actor = row["Nombre del actor"];

      if (!codigoReunion || !materiasMap[codigoReunion]) return;
      if (!inicioStr || !idConferencia) return;

      const horaInicio = new Date(inicioStr);
      const horaFin = new Date(horaInicio.getTime() + duracion * 1000);

      if (!grupos[idConferencia]) {
        grupos[idConferencia] = {
          idConferencia,
          codigoReunion,
          horaMin: horaInicio,
          horaMax: horaFin,
          participantes: new Set(),
        };
      } else {
        if (horaInicio < grupos[idConferencia].horaMin)
          grupos[idConferencia].horaMin = horaInicio;
        if (horaFin > grupos[idConferencia].horaMax)
          grupos[idConferencia].horaMax = horaFin;
      }

      if (actor) grupos[idConferencia].participantes.add(actor);
    });

    const resultado = Object.values(grupos).map((g) => {
      const duracionMs = g.horaMax - g.horaMin;
      const duracionMin = Math.floor(duracionMs / 1000 / 60);
      const horas = Math.floor(duracionMin / 60);
      const minutos = duracionMin % 60;

      const link = g.codigoReunion
        ? `https://meet.google.com/${g.codigoReunion.slice(
            0,
            3
          )}-${g.codigoReunion.slice(3, 7)}-${g.codigoReunion.slice(7, 10)}`
        : "—";

      const materia = materiasMap[g.codigoReunion] || {};

      return {
        ...g,
        duracionFormateada: `${horas}h ${minutos}m`,
        link,
        cantidadParticipantes: g.participantes.size,
        inicio: g.horaMin.toLocaleString(),
        fin: g.horaMax.toLocaleString(),
        ...materia,
      };
    });

    setReuniones(resultado);
  };

  return (
    <div className="container mt-4">
      <h2>Reporte de Reuniones de Meet</h2>

      <div className="mb-3">
        <label className="form-label">Subí el archivo meet56.csv:</label>
        <input
          type="file"
          accept=".csv"
          className="form-control"
          onChange={handleCSVUpload}
        />
      </div>

      {reuniones.length > 0 && (
        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Reunión</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Duración</th>
              <th>Participantes</th>
              <th>Materia</th>
            </tr>
          </thead>
          <tbody>
            {reuniones.map((r, i) => (
              <tr key={i}>
                <td>
                  <a href={r.link} target="_blank" rel="noreferrer">
                    {r.link}
                  </a>
                </td>
                <td>{r.inicio}</td>
                <td>{r.fin}</td>
                <td>{r.duracionFormateada}</td>
                <td>{r.cantidadParticipantes}</td>
                <td>{r.materia || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MeetReportViewer;
