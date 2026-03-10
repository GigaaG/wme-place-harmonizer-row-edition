type LogLevel = "info" | "warn" | "error";

class Logger {
  private readonly prefix = "[WMEPH-ROW]";

  info(message: string): void {
    this.write("info", message);
  }

  warn(message: string): void {
    this.write("warn", message);
  }

  error(message: string): void {
    this.write("error", message);
  }

  private write(level: LogLevel, message: string): void {
    const text = `${this.prefix} ${message}`;

    switch (level) {
      case "info":
        console.log(text);
        break;
      case "warn":
        console.warn(text);
        break;
      case "error":
        console.error(text);
        break;
    }
  }
}

export const logger = new Logger();