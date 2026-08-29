module ApplicationHelper
  # True when the request is anywhere inside a section, not only on its index.
  # current_page? matches the whole path, so it drops the active state the
  # moment you open /people/1 or /people/new - which is exactly when knowing
  # where you are matters most. The trailing slash keeps /medications from
  # claiming /medication_types.
  def section_current?(path)
    request.path == path || request.path.start_with?("#{path}/")
  end

  # An empty table cell reads as a rendering fault. An em dash reads as "nobody
  # recorded this", which is what a blank optional field actually means.
  def or_dash(value)
    value.presence || "—"
  end

  # The value aria-current wants, or nil to leave the attribute off entirely.
  # link_to drops an aria value of nil rather than rendering aria-current="".
  def aria_current_section(path)
    "page" if section_current?(path)
  end
end
