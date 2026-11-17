import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import TripPlanner from "./components/trip-planner";
import "./styles.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("Trip planner failed", error); }
  render() {
    return this.state.failed ? <div className="app-error" role="alert"><h1>行程暫時無法顯示</h1><p>已儲存的資料仍保留在瀏覽器，請重新載入。</p><button onClick={() => location.reload()}>重新載入</button><a href="./legacy.html">開啟舊版行程</a></div> : this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(<ErrorBoundary><TripPlanner/></ErrorBoundary>);
