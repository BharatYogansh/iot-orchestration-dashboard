import IoTDashboard from "./IoTDashboard.jsx"; // Added .jsx at the end
import { DataProvider } from "./context/DataContext.jsx";

export default function App() {
  return (
    <DataProvider>
      <IoTDashboard />
    </DataProvider>
  )
}