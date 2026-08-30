# The landing page for the administrative area. It has no model of its own: the
# sections it lists live in ApplicationHelper#admin_sections, and each is still
# served by its own top-level controller.
#
# When these pages stop being open to everyone, this is the seam - the
# before_action that gates the area goes here and in the three reference-data
# controllers, or they all move under an Admin:: namespace inheriting from a
# base controller that carries it.
class AdminController < ApplicationController
  def index
  end
end
