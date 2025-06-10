import "./components/css/main.css";
import MeetReportViewer from "./components/MeetReportViewer";
import NavMeet from "./components/NavMeet";

function App() {
  return (
    <div className="App">
      <NavMeet />
      <MeetReportViewer />
    </div>
  );
}

export default App;
