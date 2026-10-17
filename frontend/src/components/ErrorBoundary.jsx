import { Component } from "react";
import { useNavigate } from "react-router-dom";
import { reset } from "../api.js";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  clear = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) return <ErrorFallback onClear={this.clear} />;
    return this.props.children;
  }
}

function ErrorFallback({ onClear }) {
  const navigate = useNavigate();

  function backToQueue() {
    onClear();
    navigate("/home");
  }

  async function resetDemo() {
    await reset();
    onClear();
    navigate("/home");
  }

  return (
    <div className="error-boundary">
      <h1>Algo deu errado nesta tela.</h1>
      <div className="error-boundary-actions">
        <button
          type="button"
          className="error-boundary-primary"
          onClick={backToQueue}
        >
          Voltar à fila
        </button>
        <button
          type="button"
          className="error-boundary-secondary"
          onClick={resetDemo}
        >
          Resetar demo
        </button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
