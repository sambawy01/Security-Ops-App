-- Spatial indexes for PostGIS geometry columns
CREATE INDEX IF NOT EXISTS idx_checkpoints_location ON checkpoints USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_officer_locations_location ON officer_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
