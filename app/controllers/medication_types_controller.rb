class MedicationTypesController < ApplicationController
  before_action :set_medication_type, only: %i[ show edit update destroy ]

  # GET /medication_types or /medication_types.json
  def index
    @medication_types = MedicationType.all
  end

  # GET /medication_types/1 or /medication_types/1.json
  def show
  end

  # GET /medication_types/new
  def new
    @medication_type = MedicationType.new
  end

  # GET /medication_types/1/edit
  def edit
  end

  # POST /medication_types or /medication_types.json
  def create
    @medication_type = MedicationType.new(medication_type_params)

    respond_to do |format|
      if @medication_type.save
        format.html { redirect_to @medication_type, notice: "Medication type was successfully created." }
        format.json { render :show, status: :created, location: @medication_type }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @medication_type.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /medication_types/1 or /medication_types/1.json
  def update
    respond_to do |format|
      if @medication_type.update(medication_type_params)
        format.html { redirect_to @medication_type, notice: "Medication type was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @medication_type }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @medication_type.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /medication_types/1 or /medication_types/1.json
  def destroy
    @medication_type.destroy!

    respond_to do |format|
      format.html { redirect_to medication_types_path, notice: "Medication type was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_medication_type
      @medication_type = MedicationType.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def medication_type_params
      params.expect(medication_type: [ :name ])
    end
end
