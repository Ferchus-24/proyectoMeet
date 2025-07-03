import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const dias = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const parseHorario = (str) => {
  if (!str || typeof str !== "string" || !str.includes(" a ")) return null;
  const [inicio, fin] = str.split(" a ");
  const [h1, m1] = inicio.trim().split(":").map(Number);
  const [h2, m2] = fin.trim().split(":").map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return null;
  return { inicio: h1 * 60 + m1, fin: h2 * 60 + m2 };
};

const formatearFechaHora = (fecha) => {
  const f = new Date(fecha);
  const dia = dias[f.getDay()];
  const d = String(f.getDate()).padStart(2, "0");
  const m = String(f.getMonth() + 1).padStart(2, "0");
  const a = f.getFullYear();
  const h = String(f.getHours()).padStart(2, "0");
  const min = String(f.getMinutes()).padStart(2, "0");
  const s = String(f.getSeconds()).padStart(2, "0");
  return `${
    dia.charAt(0).toUpperCase() + dia.slice(1)
  } ${d}/${m}/${a} ${h}:${min}:${s}`;
};

const MeetReportViewer = () => {
  const [horarios, setHorarios] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [filtroCarrera, setFiltroCarrera] = useState("Todas");
  const [filtroMateria, setFiltroMateria] = useState("Todas");

  useEffect(() => {
    const url =
      window.location.protocol === "https:"
        ? "/mock/horarios.json" // si está en producción (https)
        : "http://179.0.136.79:4000/hconsulta/horariosfer"; // si está en localhost

    fetch(url)
      .then((res) => res.json())
      .then((data) => setHorarios(data))
      .catch((err) => console.error("Error al cargar horarios:", err));
  }, []);

  useEffect(() => {
    setFiltroMateria("Todas");
  }, [filtroCarrera]);

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
      const idConf = row["ID de conferencia"];
      const codigo = row["Código de reunión"]
        ?.replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
      const inicioStr = row["Hora de inicio"];
      const dur = parseInt(row["Duración (segundos)"]) || 0;
      const participante = row["Nombre del actor"];
      if (!idConf || !codigo || !inicioStr) return;

      const inicio = new Date(inicioStr);
      const fin = new Date(inicio.getTime() + dur * 1000);

      if (!grupos[idConf]) {
        grupos[idConf] = {
          codigo,
          inicioMin: inicio,
          finMax: fin,
          participantes: new Set([participante]),
        };
      } else {
        if (inicio < grupos[idConf].inicioMin)
          grupos[idConf].inicioMin = inicio;
        if (fin > grupos[idConf].finMax) grupos[idConf].finMax = fin;
        grupos[idConf].participantes.add(participante);
      }
    });

    const resultados = [];

    Object.entries(grupos).forEach(([idConf, g]) => {
      const fecha = g.inicioMin;
      const diaTexto = dias[fecha.getDay()];
      const horaMin = fecha.getHours() * 60 + fecha.getMinutes();
      const codigoReunion = g.codigo;
      const linkFormateado = `${codigoReunion.slice(
        0,
        3
      )}-${codigoReunion.slice(3, 7)}-${codigoReunion.slice(7)}`;

      const docentes = horarios.filter((h) => {
        const code = h.lugar_v
          ?.trim()
          .split("/")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
        return code === codigoReunion;
      });

      if (docentes.length === 0) return;

      let coincidencia = null;
      let motivo = "No hay coincidencia de horario";

      for (const doc of docentes) {
        for (const dia of dias.slice(1, 7)) {
          const horario = doc[dia];
          const esperado = parseHorario(horario);
          if (!esperado) continue;

          const diaDocente = dias.indexOf(dia);
          if (diaDocente === fecha.getDay()) {
            if (horaMin >= esperado.inicio && horaMin <= esperado.fin) {
              coincidencia = {
                idConferencia: idConf,
                codigoMateria: doc.id_mat,
                materia: doc.materia,
                carrera: doc.carrera,
                legajo: doc.legajo,
                apellido: doc.apellido,
                link: linkFormateado,
                inicio: formatearFechaHora(g.inicioMin),
                fin: formatearFechaHora(g.finMax),
                horarioEsperado: `${
                  dia.charAt(0).toUpperCase() + dia.slice(1)
                } ${horario}`,
                asistencia: "Sí",
                motivo: "",
                duracion: `${Math.floor(
                  (g.finMax - g.inicioMin) / 3600000
                )}h ${Math.round(
                  ((g.finMax - g.inicioMin) % 3600000) / 60000
                )}m`,
                participantes: g.participantes.size,
              };
              break;
            }

            // Segunda comprobación: ingreso hasta 30 minutos antes
            if (horaMin >= esperado.inicio - 30 && horaMin < esperado.inicio) {
              coincidencia = {
                idConferencia: idConf,
                codigoMateria: doc.id_mat,
                materia: doc.materia,
                carrera: doc.carrera,
                legajo: doc.legajo,
                apellido: doc.apellido,
                link: linkFormateado,
                inicio: formatearFechaHora(g.inicioMin),
                fin: formatearFechaHora(g.finMax),
                horarioEsperado: `${
                  dia.charAt(0).toUpperCase() + dia.slice(1)
                } ${horario}`,
                asistencia: "Sí",
                motivo: "Segunda comprobación: ingresó antes",
                duracion: `${Math.floor(
                  (g.finMax - g.inicioMin) / 3600000
                )}h ${Math.round(
                  ((g.finMax - g.inicioMin) % 3600000) / 60000
                )}m`,
                participantes: g.participantes.size,
              };
              break;
            }
          }
        }
        if (coincidencia) break;
      }

      if (!coincidencia) {
        resultados.push({
          idConferencia: idConf,
          codigoMateria: "-",
          materia: "-",
          carrera: "-",
          legajo: "-",
          apellido: "-",
          link: linkFormateado,
          inicio: formatearFechaHora(g.inicioMin),
          fin: formatearFechaHora(g.finMax),
          horarioEsperado: "-",
          asistencia: "No",
          motivo,
          duracion: `${Math.floor(
            (g.finMax - g.inicioMin) / 3600000
          )}h ${Math.round(((g.finMax - g.inicioMin) % 3600000) / 60000)}m`,
          participantes: g.participantes.size,
        });
      } else {
        resultados.push(coincidencia);
      }
    });

    setReuniones(resultados);
  };

  const exportarExcel = () => {
    const datos = reuniones
      .filter((r) => filtroCarrera === "Todas" || r.carrera === filtroCarrera)
      .filter((r) => filtroMateria === "Todas" || r.materia === filtroMateria)
      .map((r) => ({
        "Código Materia": r.codigoMateria,
        Materia: r.materia,
        Carrera: r.carrera,
        Legajo: r.legajo,
        Apellido: r.apellido,
        Reunión: r.link,
        Inicio: r.inicio,
        Fin: r.fin,
        "Horario informado": r.horarioEsperado,
        "¿Asistió en horario?": r.asistencia,
        Motivo: r.motivo,
        Duración: r.duracion,
        Participantes: r.participantes,
      }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");

    const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      "asistencia_docente.xlsx"
    );
  };

  const carrerasUnicas = Array.from(
    new Set(reuniones.map((r) => r.carrera))
  ).sort();
  const materiasUnicas = Array.from(
    new Set(
      reuniones
        .filter((r) => filtroCarrera === "Todas" || r.carrera === filtroCarrera)
        .map((r) => r.materia)
    )
  ).sort();

  return (
    <div className="container mt-4">
      <h3>Asistencia docentes</h3>
      <input
        type="file"
        accept=".csv"
        className="form-control mb-3"
        onChange={handleCSVUpload}
      />

      {reuniones.length > 0 && (
        <>
          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">Filtrar por carrera</label>
              <select
                className="form-select"
                value={filtroCarrera}
                onChange={(e) => setFiltroCarrera(e.target.value)}
              >
                <option value="Todas">Todas</option>
                {carrerasUnicas.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold">Filtrar por materia</label>
              <select
                className="form-select"
                value={filtroMateria}
                onChange={(e) => setFiltroMateria(e.target.value)}
              >
                <option value="Todas">Todas</option>
                {materiasUnicas.map((m, i) => (
                  <option key={i} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                id="botones"
                className="btn b w-50"
                onClick={exportarExcel}
              >
                Exportar a Excel
              </button>
            </div>
          </div>

          <table className="table table-bordered">
            <thead className="table-light text-center">
              <tr>
                <th>Código Materia</th>
                <th>Materia</th>
                <th>Carrera</th>
                <th>Legajo</th>
                <th>Apellido</th>
                <th>Reunión</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Horario informado</th>
                <th>¿Asistió en horario?</th>
                <th>Motivo</th>
                <th>Duración</th>
                <th>Participantes</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {reuniones
                .filter(
                  (r) =>
                    filtroCarrera === "Todas" || r.carrera === filtroCarrera
                )
                .filter(
                  (r) =>
                    filtroMateria === "Todas" || r.materia === filtroMateria
                )
                .map((r, i) => (
                  <tr key={i}>
                    <td>{r.codigoMateria}</td>
                    <td>{r.materia}</td>
                    <td>{r.carrera}</td>
                    <td>{r.legajo}</td>
                    <td>{r.apellido}</td>
                    <td>{r.link}</td>
                    <td>{r.inicio}</td>
                    <td>{r.fin}</td>
                    <td>{r.horarioEsperado}</td>
                    <td>{r.asistencia}</td>
                    <td>{r.motivo}</td>
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
