class AppointmentRequirementsController < ApplicationController
  before_action :set_appointment_requirement, only: %i[ show edit update destroy ]

  # GET /appointment_requirements or /appointment_requirements.json
  def index
    @appointment_requirements = AppointmentRequirement.all
  end

  # GET /appointment_requirements/1 or /appointment_requirements/1.json
  def show
  end

  # GET /appointment_requirements/new
  def new
    @appointment_requirement = AppointmentRequirement.new
  end

  # GET /appointment_requirements/1/edit
  def edit
  end

  # POST /appointment_requirements or /appointment_requirements.json
  def create
    @appointment_requirement = AppointmentRequirement.new(appointment_requirement_params)

    respond_to do |format|
      if @appointment_requirement.save
        format.html { redirect_to @appointment_requirement, notice: "Appointment requirement was successfully created." }
        format.json { render :show, status: :created, location: @appointment_requirement }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @appointment_requirement.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /appointment_requirements/1 or /appointment_requirements/1.json
  def update
    respond_to do |format|
      if @appointment_requirement.update(appointment_requirement_params)
        format.html { redirect_to @appointment_requirement, notice: "Appointment requirement was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @appointment_requirement }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @appointment_requirement.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /appointment_requirements/1 or /appointment_requirements/1.json
  def destroy
    @appointment_requirement.destroy!

    respond_to do |format|
      format.html { redirect_to appointment_requirements_path, notice: "Appointment requirement was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_appointment_requirement
      @appointment_requirement = AppointmentRequirement.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def appointment_requirement_params
      params.expect(appointment_requirement: [ :name ])
    end
end
