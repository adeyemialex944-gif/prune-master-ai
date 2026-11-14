from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import models here so Base knows about all tables
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Safe SQLite schema migration for newly added columns
    from sqlalchemy import text
    with engine.connect() as conn:
        def add_column_if_missing(table: str, col_name: str, col_type: str):
            try:
                res = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                existing_cols = [row[1] for row in res]
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
            except Exception as e:
                pass

        # User columns
        add_column_if_missing("users", "avatar_url", "VARCHAR(500)")
        add_column_if_missing("users", "trial_credits", "INTEGER DEFAULT 10")
        add_column_if_missing("users", "trial_credits_used", "INTEGER DEFAULT 0")
        add_column_if_missing("users", "is_pro", "BOOLEAN DEFAULT 0")
        add_column_if_missing("users", "registration_ip", "VARCHAR(100)")
        add_column_if_missing("users", "last_ip", "VARCHAR(100)")
        add_column_if_missing("users", "gemini_api_key", "VARCHAR(255)")
        add_column_if_missing("users", "gemini_model", "VARCHAR(100) DEFAULT 'gemini-2.5-pro'")

        # IP Trial Record columns
        add_column_if_missing("ip_trial_records", "is_unlimited", "BOOLEAN DEFAULT 0")

        # Video columns
        add_column_if_missing("videos", "client_ip", "VARCHAR(100)")

        # Clip columns
        add_column_if_missing("clips", "volume_level", "FLOAT DEFAULT 1.0")
        add_column_if_missing("clips", "remove_silence", "BOOLEAN DEFAULT 0")
        add_column_if_missing("clips", "watermark", "BOOLEAN DEFAULT 1")
        add_column_if_missing("clips", "watermark_text", "VARCHAR(100) DEFAULT 'ClipMaster AI'")
        add_column_if_missing("clips", "transition", "VARCHAR(50) DEFAULT 'none'")
        add_column_if_missing("clips", "bg_music", "VARCHAR(100)")
        add_column_if_missing("clips", "bg_music_volume", "FLOAT DEFAULT 0.18")
        add_column_if_missing("clips", "client_ip", "VARCHAR(100)")

        # Seed default monetization setting (disabled by default for free launch trust-building)
        try:
            setting = conn.execute(text("SELECT key, value FROM system_settings WHERE key = 'monetization_enabled'")).fetchone()
            if not setting:
                conn.execute(
                    text("INSERT INTO system_settings (key, value, description, updated_at) VALUES ('monetization_enabled', 'false', 'Global monetization & paywall switch', CURRENT_TIMESTAMP)")
                )
                conn.commit()
        except Exception:
            pass
